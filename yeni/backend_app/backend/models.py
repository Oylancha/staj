from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class AdminUser(Base):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    image_url = Column(String, nullable=True)
    manual_url = Column(String, nullable=True)
    parent_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    # Allows fetching children
    children = relationship("Product", backref="parent", remote_side=[id])
