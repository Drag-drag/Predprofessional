from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import models
from schemas import schemas
from .auth import get_current_user

router = APIRouter(
    prefix="/requests",
    tags=["requests"]
)

@router.get("/", response_model=List[schemas.InventoryRequest])
async def read_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == models.UserRole.ADMIN:
        requests = db.query(models.InventoryRequest).all()
    else:
        requests = db.query(models.InventoryRequest).filter(
            models.InventoryRequest.user_id == current_user.id
        ).all()
    return requests

@router.post("/", response_model=schemas.InventoryRequest)
async def create_request(
    request: schemas.InventoryRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверяем существование предмета
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == request.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Предмет не найден")
    
    # Проверяем доступное количество
    if item.quantity < request.quantity:
        raise HTTPException(status_code=400, detail="Недостаточное количество предметов")
    
    db_request = models.InventoryRequest(
        **request.dict(),
        user_id=current_user.id,
        status=models.RequestStatus.PENDING
    )
    
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request

@router.put("/{request_id}/status", response_model=schemas.InventoryRequest)
async def update_request_status(
    request_id: int,
    status_update: schemas.RequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        if current_user.role != models.UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только администратор может изменять статус заявок"
            )
        
        db_request = db.query(models.InventoryRequest).filter(
            models.InventoryRequest.id == request_id
        ).first()
        
        if not db_request:
            raise HTTPException(status_code=404, detail="Заявка не найдена")
        
        # Получаем предмет
        item = db.query(models.InventoryItem).filter(
            models.InventoryItem.id == db_request.item_id
        ).first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Предмет не найден")
        
        # Если заявка одобряется
        if status_update.status == models.RequestStatus.APPROVED:
            if item.quantity < db_request.quantity:
                raise HTTPException(
                    status_code=400,
                    detail="Недостаточное количество предметов"
                )
            item.quantity -= db_request.quantity
        
        # Если предмет возвращается
        elif (status_update.status == models.RequestStatus.RETURNED and 
              db_request.status == models.RequestStatus.APPROVED):
            item.quantity += db_request.quantity
        
        db_request.status = status_update.status
        db.commit()
        db.refresh(db_request)
        return db_request
        
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        print(f"Ошибка при обновлении статуса заявки: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при обновлении статуса заявки"
        )