from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import models
from schemas import schemas
from .auth import get_current_user

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"]
)

def check_admin(current_user: models.User):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только администратор может выполнять это действие"
        )

@router.get("/items/", response_model=List[schemas.InventoryItem])
async def read_items(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        items = db.query(models.InventoryItem).all()
        return items
    except Exception as e:
        print(f"Ошибка при получении предметов: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении списка предметов"
        )

@router.post("/items/", response_model=schemas.InventoryItem)
async def create_item(
    item: schemas.InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    check_admin(current_user)
    try:
        db_item = models.InventoryItem(**item.dict())
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item
    except Exception as e:
        db.rollback()
        print(f"Ошибка при создании предмета: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при создании предмета"
        )

@router.put("/items/{item_id}", response_model=schemas.InventoryItem)
async def update_item(
    item_id: int,
    item: schemas.InventoryItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    check_admin(current_user)
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Предмет не найден")
    
    try:
        for key, value in item.dict().items():
            setattr(db_item, key, value)
        db.commit()
        db.refresh(db_item)
        return db_item
    except Exception as e:
        db.rollback()
        print(f"Ошибка при обновлении предмета: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при обновлении предмета"
        )

@router.delete("/items/{item_id}")
async def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    check_admin(current_user)
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Предмет не найден")
    
    try:
        db.delete(db_item)
        db.commit()
        return {"message": "Предмет успешно удален"}
    except Exception as e:
        db.rollback()
        print(f"Ошибка при удалении предмета: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при удалении предмета"
        )

@router.get("/items/{item_id}", response_model=schemas.InventoryItem)
async def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Предмет не найден")
        return item
    except Exception as e:
        print(f"Ошибка при получении предмета: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении предмета"
        )