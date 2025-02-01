from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime
from models.models import UserRole, ItemStatus, RequestStatus
from enum import Enum

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: UserRole = UserRole.USER

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class InventoryItemBase(BaseModel):
    name: str
    quantity: int
    status: ItemStatus = ItemStatus.NEW

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(InventoryItemBase):
    pass

class InventoryItem(InventoryItemBase):
    id: int
    assigned_to_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class RequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    RETURNED = "returned"

class RequestStatusUpdate(BaseModel):
    status: RequestStatus

class InventoryRequestBase(BaseModel):
    item_id: int
    quantity: int
    return_date: datetime
    comment: Optional[str] = None

class InventoryRequestCreate(InventoryRequestBase):
    pass

class InventoryRequest(InventoryRequestBase):
    id: int
    user_id: int
    status: RequestStatus
    created_at: datetime
    item: Optional[InventoryItem] = None
    user: Optional[User] = None
    model_config = ConfigDict(from_attributes=True)