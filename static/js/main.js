const BASE_URL = 'http://127.0.0.1:8000';

// Проверка авторизации
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

// Проверка роли администратора
function isAdmin() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        // Декодируем JWT токен
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        
        // Отладка
        console.log('Токен:', token);
        console.log('Полезная нагрузка токена:', payload);
        
        // Проверяем роль в токене
        return payload.role === 'admin';
    } catch (error) {
        console.error('Ошибка при проверке роли администратора:', error);
        return false;
    }
}

// Загрузка списка инвентаря
async function loadInventoryItems() {
    if (!checkAuth()) return;

    try {
        const response = await fetch('/api/inventory/items/', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            // Если токен недействителен, перенаправляем на страницу входа
            localStorage.removeItem('token');
            window.location.href = '/login';
            return;
        }

        if (response.ok) {
            const items = await response.json();
            displayInventoryItems(items);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка при загрузке инвентаря');
        }
    } catch (error) {
        console.error('Ошибка загрузки инвентаря:', error);
        showNotification('Ошибка', error.message, 'error');
    }
}

// Получение цвета для статуса
function getStatusColor(status) {
    const colors = {
        'new': 'success',      // зеленый
        'used': 'warning',     // желтый
        'broken': 'danger'     // красный
    };
    return colors[status] || 'secondary';  // серый по умолчанию
}

// Отображение списка инвентаря
function displayInventoryItems(items) {
    const tableBody = document.getElementById('inventoryTableBody');
    if (!tableBody) return;

    const isAdminUser = isAdmin();
    console.log('Пользователь админ?', isAdminUser); // Отладка

    tableBody.innerHTML = '';

    if (items && items.length > 0) {
        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td><span class="badge bg-${getStatusColor(item.status)}">${item.status}</span></td>
                <td>
                    ${isAdminUser ? `
                        <button class="btn btn-sm btn-primary" onclick="editItem(${item.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">Нет доступных предметов</td>
            </tr>
        `;
    }

    // Показываем/скрываем кнопку добавления предмета
    const addItemButton = document.querySelector('[data-bs-target="#addItemModal"]');
    if (addItemButton) {
        addItemButton.style.display = isAdminUser ? 'block' : 'none';
    }
}

// Обновим функцию handleLogin с подробной отладкой
async function handleLogin(event) {
    event.preventDefault();
    console.log('Начало процесса входа'); // Отладка
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        console.log('Отправка запроса на /api/auth/login'); // Отладка
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            body: formData
        });
        
        console.log('Получен ответ:', response.status); // Отладка
        
        if (response.ok) {
            const data = await response.json();
            console.log('Успешный вход, получен токен:', data.access_token); // Отладка
            
            localStorage.setItem('token', data.access_token);
            console.log('Токен сохранен в localStorage'); // Отладка
            
            console.log('Перенаправление на /inventory'); // Отладка
            window.location.replace('/inventory');  // Заменили href на replace
            
            // Добавим резервное перенаправление через таймаут
            setTimeout(() => {
                if (window.location.pathname !== '/inventory') {
                    console.log('Принудительное перенаправление'); // Отладка
                    window.location.href = '/inventory';
                }
            }, 100);
        } else {
            const error = await response.json();
            console.error('Ошибка входа:', error); // Отладка
            showNotification('Ошибка!', error.detail, 'error');
        }
    } catch (error) {
        console.error('Критическая ошибка:', error); // Отладка
        showNotification('Ошибка!', 'Произошла ошибка при входе', 'error');
    }
}

function showNotification(title, message, icon) {
    Swal.fire({
        title: title,
        text: message,
        icon: icon,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });
}

// Добавим функцию проверки текущей страницы
function checkCurrentPage() {
    console.log('Текущий путь:', window.location.pathname); // Отладка
    if (window.location.pathname === '/inventory') {
        console.log('Загрузка инвентаря...'); // Отладка
        loadInventoryItems();
    }
}

// Функция выхода из аккаунта
async function logout() {
    try {
        const result = await Swal.fire({
            title: 'Подтверждение',
            text: 'Вы действительно хотите выйти?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Да, выйти',
            cancelButtonText: 'Отмена'
        });

        if (result.isConfirmed) {
            // Очищаем токен
            localStorage.removeItem('token');
            
            // Показываем уведомление
            showNotification('Успех', 'Вы успешно вышли из системы', 'success');
            
            // Перенаправляем на страницу входа
            setTimeout(() => {
                window.location.replace('/login');
            }, 1000);
        }
    } catch (error) {
        console.error('Ошибка при выходе:', error);
        showNotification('Ошибка', 'Не удалось выполнить выход', 'error');
    }
}

// Обновим инициализацию
document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена'); // Отладка
    console.log('Текущий путь:', window.location.pathname); // Отладка
    console.log('Наличие токена:', !!localStorage.getItem('token')); // Отладка
    
    // Если мы на странице входа и уже авторизованы
    if (window.location.pathname === '/login' && localStorage.getItem('token')) {
        console.log('Перенаправление авторизованного пользователя на /inventory'); // Отладка
        window.location.replace('/inventory');
        return;
    }
    
    // Если мы на странице инвентаря
    if (window.location.pathname === '/inventory') {
        if (!localStorage.getItem('token')) {
            console.log('Перенаправление неавторизованного пользователя на /login'); // Отладка
            window.location.replace('/login');
        } else {
            console.log('Загрузка данных инвентаря'); // Отладка
            loadInventoryItems();
        }
    }

    // Скрываем/показываем кнопку выхода в зависимости от авторизации
    const logoutButton = document.querySelector('.btn-outline-light');
    if (logoutButton) {
        logoutButton.style.display = localStorage.getItem('token') ? 'block' : 'none';
    }
});

// Добавление нового предмета
async function addItem() {
    if (!checkAuth()) return;

    const name = document.getElementById('itemName').value;
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const status = document.getElementById('itemStatus').value;

    try {
        const response = await fetch('/api/inventory/items/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                quantity,
                status
            })
        });

        if (response.ok) {
            showNotification('Успех', 'Предмет успешно добавлен', 'success');
            
            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('addItemModal'));
            modal.hide();
            
            // Очищаем форму
            document.getElementById('addItemForm').reset();
            
            // Обновляем список предметов
            await loadInventoryItems();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка при добавлении предмета');
        }
    } catch (error) {
        console.error('Ошибка при добавлении предмета:', error);
        showNotification('Ошибка', error.message, 'error');
    }
}

// Редактирование предмета
async function editItem(itemId) {
    if (!checkAuth()) return;

    try {
        // Получаем данные предмета
        const response = await fetch(`/api/inventory/items/${itemId}`, {
            method: 'GET',  // Явно указываем метод GET
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const item = await response.json();
            console.log('Полученные данные предмета:', item); // Отладка
            
            // Заполняем форму редактирования
            document.getElementById('editItemId').value = item.id;
            document.getElementById('editItemName').value = item.name;
            document.getElementById('editItemQuantity').value = item.quantity;
            document.getElementById('editItemStatus').value = item.status;

            // Открываем модальное окно
            const modal = new bootstrap.Modal(document.getElementById('editItemModal'));
            modal.show();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка при загрузке данных предмета');
        }
    } catch (error) {
        console.error('Ошибка при редактировании предмета:', error);
        showNotification('Ошибка', error.message, 'error');
    }
}

// Обновление предмета
async function updateItem() {
    if (!checkAuth()) return;

    const itemId = document.getElementById('editItemId').value;
    const name = document.getElementById('editItemName').value;
    const quantity = parseInt(document.getElementById('editItemQuantity').value);
    const status = document.getElementById('editItemStatus').value;

    try {
        const response = await fetch(`/api/inventory/items/${itemId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                quantity,
                status
            })
        });

        if (response.ok) {
            showNotification('Успех', 'Предмет успешно обновлен', 'success');
            
            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('editItemModal'));
            modal.hide();
            
            // Обновляем список предметов
            await loadInventoryItems();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка при обновлении предмета');
        }
    } catch (error) {
        console.error('Ошибка при обновлении предмета:', error);
        showNotification('Ошибка', error.message, 'error');
    }
}

// Удаление предмета
async function deleteItem(itemId) {
    if (!checkAuth()) return;

    try {
        const result = await Swal.fire({
            title: 'Подтверждение',
            text: 'Вы действительно хотите удалить этот предмет?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Да, удалить',
            cancelButtonText: 'Отмена'
        });

        if (result.isConfirmed) {
            const response = await fetch(`/api/inventory/items/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                showNotification('Успех', 'Предмет успешно удален', 'success');
                await loadInventoryItems();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ошибка при удалении предмета');
            }
        }
    } catch (error) {
        console.error('Ошибка при удалении предмета:', error);
        showNotification('Ошибка', error.message, 'error');
    }
}

// Загрузка списка предметов для выпадающего списка
async function loadItemsForSelect() {
    if (!checkAuth()) return;

    try {
        const response = await fetch('/api/inventory/items/', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const items = await response.json();
            const select = document.getElementById('itemSelect');
            select.innerHTML = '<option value="">Выберите предмет</option>';
            
            items.forEach(item => {
                if (item.quantity > 0) { // Показываем только доступные предметы
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = `${item.name} (в наличии: ${item.quantity})`;
                    select.appendChild(option);
                }
            });
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка при загрузке списка предметов');
        }
    } catch (error) {
        console.error('Ошибка при загрузке списка предметов:', error);
        showNotification('Ошибка', error.message, 'error');
    }
}

// Создание заявки
async function createRequest() {
    if (!checkAuth()) return;

    const itemId = document.getElementById('itemSelect').value;
    const quantity = parseInt(document.getElementById('requestQuantity').value);
    const returnDate = document.getElementById('returnDate').value;
    const comment = document.getElementById('comment').value;

    try {
        const response = await fetch('/api/requests/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                item_id: parseInt(itemId),
                quantity: quantity,
                return_date: returnDate,
                comment: comment
            })
        });

        if (response.ok) {
            showNotification('Успех', 'Заявка успешно создана', 'success');
            
            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('createRequestModal'));
            modal.hide();
            
            // Очищаем форму
            document.getElementById('createRequestForm').reset();
            
            // Обновляем список заявок, если мы на странице заявок
            if (window.location.pathname === '/requests') {
                await loadRequests();
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка при создании заявки');
        }
    } catch (error) {
        console.error('Ошибка при создании заявки:', error);
        showNotification('Ошибка', error.message, 'error');
    }
}

// Добавляем обработчик события для модального окна создания заявки
document.addEventListener('DOMContentLoaded', () => {
    const createRequestModal = document.getElementById('createRequestModal');
    if (createRequestModal) {
        createRequestModal.addEventListener('show.bs.modal', () => {
            loadItemsForSelect();
        });
    }
    
    // ... остальной код инициализации ...
});

// Загрузка списка заявок
async function loadRequests() {
    if (!checkAuth()) return;

    try {
        const response = await fetch('/api/requests/', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const requests = await response.json();
            displayRequests(requests);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка при загрузке заявок');
        }
    } catch (error) {
        console.error('Ошибка при загрузке заявок:', error);
        showNotification('Ошибка', error.message, 'error');
    }
}

// Отображение списка заявок
function displayRequests(requests) {
    const tableBody = document.getElementById('requestsTableBody');
    if (!tableBody) return;

    const isAdminUser = isAdmin();
    tableBody.innerHTML = '';

    if (requests && requests.length > 0) {
        requests.forEach(request => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${request.id}</td>
                <td>${request.item ? request.item.name : 'Н/Д'}</td>
                <td>${request.quantity}</td>
                <td><span class="badge bg-${getRequestStatusColor(request.status)}">${request.status}</span></td>
                <td>${new Date(request.created_at).toLocaleString()}</td>
                <td>${request.return_date ? new Date(request.return_date).toLocaleString() : 'Не указано'}</td>
                <td>
                    ${isAdminUser ? `
                        <div class="btn-group">
                            <button class="btn btn-sm btn-success" onclick="updateRequestStatus(${request.id}, 'approved')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="updateRequestStatus(${request.id}, 'rejected')">
                                <i class="fas fa-times"></i>
                            </button>
                            <button class="btn btn-sm btn-info" onclick="updateRequestStatus(${request.id}, 'returned')">
                                <i class="fas fa-undo"></i>
                            </button>
                        </div>
                    ` : ''}
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">Нет доступных заявок</td>
            </tr>
        `;
    }
}

// Получение цвета для статуса заявки
function getRequestStatusColor(status) {
    const colors = {
        'pending': 'warning',    // желтый
        'approved': 'success',   // зеленый
        'rejected': 'danger',    // красный
        'returned': 'info'       // синий
    };
    return colors[status] || 'secondary';  // серый по умолчанию
}

// Обновление статуса заявки
async function updateRequestStatus(requestId, newStatus) {
    if (!checkAuth()) return;

    // Словарь для перевода статусов
    const statusTranslations = {
        'pending': 'в ожидании',
        'approved': 'одобрено',
        'rejected': 'отклонено',
        'returned': 'возвращено'
    };

    try {
        // Запрашиваем подтверждение
        const result = await Swal.fire({
            title: 'Подтверждение',
            text: `Вы уверены, что хотите изменить статус заявки на "${statusTranslations[newStatus] || newStatus}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Да, изменить',
            cancelButtonText: 'Отмена'
        });

        if (result.isConfirmed) {
            console.log('Отправка запроса на обновление статуса:', {
                requestId,
                newStatus,
                url: `/api/requests/${requestId}/status`
            });

            const response = await fetch(`/api/requests/${requestId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: newStatus  // Изменено с new_status на status
                })
            });

            console.log('Ответ сервера:', response.status); // Отладка

            if (response.ok) {
                const data = await response.json();
                console.log('Данные ответа:', data); // Отладка
                
                showNotification(
                    'Успех',
                    `Статус заявки успешно изменен на "${statusTranslations[newStatus] || newStatus}"`,
                    'success'
                );
                await loadRequests();
            } else {
                const errorData = await response.json();
                console.error('Ошибка от сервера:', errorData); // Отладка
                throw new Error(errorData.detail || 'Не удалось обновить статус заявки');
            }
        }
    } catch (error) {
        console.error('Полная ошибка:', error); // Отладка
        showNotification(
            'Ошибка',
            error.message || 'Произошла ошибка при обновлении статуса заявки',
            'error'
        );
    }
}

// Обновляем инициализацию при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // ... существующий код ...

    // Если мы на странице заявок, загружаем их
    if (window.location.pathname === '/requests') {
        loadRequests();
    }
});