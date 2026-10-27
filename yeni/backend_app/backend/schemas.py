from pydantic import BaseModel
from typing import List, Optional

class ProductImageBase(BaseModel):
    image_url: str
    sort_order: int = 0

class ProductImageCreate(ProductImageBase):
    pass

class ProductImage(ProductImageBase):
    id: int
    product_id: int

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    description: str
    image_url: Optional[str] = None
    manual_url: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = 0
    manual_sort_order: Optional[int] = 0

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    images: List[ProductImage] = []

    class Config:
        from_attributes = True

class ReferenceBase(BaseModel):
    company_name: str
    logo_url: Optional[str] = None
    description: Optional[str] = None
    product_ids: Optional[str] = "[]"
    images: Optional[str] = "[]"
    sort_order: Optional[int] = 0

class ReferenceCreate(ReferenceBase):
    pass

class Reference(ReferenceBase):
    id: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginData(BaseModel):
    username: str
    password: str

class ChangePasswordData(BaseModel):
    username: str
    current_password: str
    new_password: str
