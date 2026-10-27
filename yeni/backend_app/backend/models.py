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
    sort_order = Column(Integer, default=0)
    manual_sort_order = Column(Integer, default=0)
    
    # Allows fetching children
    children = relationship("Product", backref="parent", remote_side=[id])
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order")

class ProductImage(Base):
    __tablename__ = "product_images"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String, nullable=False)
    sort_order = Column(Integer, default=0)

    product = relationship("Product", back_populates="images")

class Reference(Base):
    __tablename__ = "references"
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True, nullable=False)
    logo_url = Column(String, nullable=True)
    description = Column(String, nullable=True)
    product_ids = Column(String, nullable=True)  # JSON string e.g. "[8, 10]"
    images = Column(String, nullable=True, default="[]")
    sort_order = Column(Integer, default=0)
