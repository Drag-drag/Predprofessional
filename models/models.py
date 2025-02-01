from sqlalchemy import Boolean, Column, Integer, String, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import enum
import datetime

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class ItemStatus(str, enum.Enum):
    NEW = "new"
    USED = "used"
    BROKEN = "broken"

class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    RETURNED = "returned"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)

    items = relationship("InventoryItem", back_populates="assigned_to")
    requests = relationship("InventoryRequest", back_populates="user")

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    quantity = Column(Integer)
    status = Column(Enum(ItemStatus), default=ItemStatus.NEW)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    assigned_to = relationship("User", back_populates="items")
    requests = relationship("InventoryRequest", back_populates="item")

class InventoryRequest(Base):
    __tablename__ = "inventory_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    item_id = Column(Integer, ForeignKey("inventory_items.id"))
    quantity = Column(Integer)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    return_date = Column(DateTime)
    comment = Column(String, nullable=True)

    user = relationship("User", back_populates="requests")
    item = relationship("InventoryItem", back_populates="requests")