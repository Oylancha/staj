from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import List, Optional
import os
import shutil
import uuid
import json
import bcrypt

from . import models, schemas, database

# Security configuration
SECRET_KEY = "SUPER_SECRET_KEY_FOR_DRAFT"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
MAX_PRODUCT_IMAGES = 20

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Ikies Elektronik API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        h = hashed_password
        if h.startswith("$2y$"):
            h = "$2b$" + h[4:]
        return bcrypt.checkpw(plain_password.encode("utf-8"), h.encode("utf-8"))
    except Exception:
        return False

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = None, db: Session = Depends(database.get_db)):
    # Simple check for draft/MVP
    return "admin"

@app.on_event("startup")
def create_default_admin():
    db = database.SessionLocal()
    try:
        user = db.query(models.AdminUser).filter(models.AdminUser.username == "admin").first()
        if not user:
            hashed = hash_password("Serdar1")
            admin = models.AdminUser(username="admin", hashed_password=hashed)
            db.add(admin)
            db.commit()
        else:
            # Check if current hash verifies or is corrupt
            if not verify_password("Serdar1", user.hashed_password) and not verify_password("admin123", user.hashed_password):
                # If it doesn't even verify as Serdar1 or admin123, check if it's a valid bcrypt hash
                try:
                    h = user.hashed_password
                    if h.startswith("$2y$"):
                        h = "$2b$" + h[4:]
                    bcrypt.checkpw(b"test", h.encode("utf-8"))
                except ValueError:
                    # Invalid salt or corrupt hash - repair to Serdar1
                    user.hashed_password = hash_password("Serdar1")
                    db.commit()
    except Exception as e:
        print("Admin startup check error:", e)
    finally:
        db.close()

# ── Auth Endpoints ──

@app.post("/api/login", response_model=schemas.Token)
def login(login_data: schemas.LoginData, db: Session = Depends(database.get_db)):
    user = db.query(models.AdminUser).filter(models.AdminUser.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Geçersiz kullanıcı adı veya şifre.")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/change-password")
def change_password(data: schemas.ChangePasswordData, db: Session = Depends(database.get_db)):
    user = db.query(models.AdminUser).filter(models.AdminUser.username == data.username).first()
    if not user or not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Mevcut şifre hatalı.")
    
    if len(data.new_password) < 4:
        raise HTTPException(status_code=400, detail="Yeni şifre en az 4 karakter olmalıdır.")
    
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Şifre başarıyla değiştirildi."}

# ── Product Endpoints ──

@app.get("/api/products", response_model=List[schemas.Product])
def get_products(db: Session = Depends(database.get_db)):
    return db.query(models.Product).all()

@app.get("/api/products/{product_id}", response_model=schemas.Product)
def get_product(product_id: int, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı.")
    return product

@app.post("/api/products", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(database.get_db)):
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.put("/api/products/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: int,
    product_data: schemas.ProductCreate,
    db: Session = Depends(database.get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı.")
    
    for key, value in product_data.dict().items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    return product

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı.")
        
    # Detach children so they become root nodes
    children = db.query(models.Product).filter(models.Product.parent_id == product_id).all()
    for child in children:
        child.parent_id = None
        
    db.delete(product)
    db.commit()
    return {"message": "Ürün silindi."}

# ── Product Images (Task 1: Max 20 photos) ──

@app.post("/api/products/{product_id}/images", response_model=schemas.ProductImage)
def add_product_image(product_id: int, image_data: schemas.ProductImageCreate, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı.")
    
    current_count = db.query(models.ProductImage).filter(models.ProductImage.product_id == product_id).count()
    if current_count >= MAX_PRODUCT_IMAGES:
        raise HTTPException(status_code=400, detail=f"Bir ürün için en fazla {MAX_PRODUCT_IMAGES} adet görsel eklenebilir.")
    
    db_img = models.ProductImage(
        product_id=product_id,
        image_url=image_data.image_url,
        sort_order=image_data.sort_order or current_count
    )
    db.add(db_img)
    db.commit()
    db.refresh(db_img)
    return db_img

@app.post("/api/products/{product_id}/images/batch", response_model=List[schemas.ProductImage])
def add_product_images_batch(product_id: int, batch_data: dict, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı.")
    
    current_count = db.query(models.ProductImage).filter(models.ProductImage.product_id == product_id).count()
    urls = batch_data.get("image_urls", [])
    if not isinstance(urls, list):
        urls = []
        
    available = max(0, MAX_PRODUCT_IMAGES - current_count)
    urls = urls[:available]
    
    created = []
    for idx, u in enumerate(urls):
        u = str(u).strip()
        if not u:
            continue
        order = current_count + idx
        db_img = models.ProductImage(product_id=product_id, image_url=u, sort_order=order)
        db.add(db_img)
        db.commit()
        db.refresh(db_img)
        created.append(db_img)
        
    return created

@app.delete("/api/products/{product_id}/images/{image_id}")
def delete_product_image(product_id: int, image_id: int, db: Session = Depends(database.get_db)):
    img = db.query(models.ProductImage).filter(
        models.ProductImage.id == image_id,
        models.ProductImage.product_id == product_id
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Görsel bulunamadı.")
    
    db.delete(img)
    db.commit()
    return {"message": "Görsel silindi."}

# ── References Endpoints (Task 2 & 3) ──

@app.get("/api/references", response_model=List[schemas.Reference])
def get_references(db: Session = Depends(database.get_db)):
    return db.query(models.Reference).all()

@app.get("/api/references/{reference_id}", response_model=schemas.Reference)
def get_reference(reference_id: int, db: Session = Depends(database.get_db)):
    ref = db.query(models.Reference).filter(models.Reference.id == reference_id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Referans bulunamadı.")
    return ref

@app.post("/api/references", response_model=schemas.Reference)
def create_reference(ref_data: schemas.ReferenceCreate, db: Session = Depends(database.get_db)):
    ref = models.Reference(**ref_data.dict())
    db.add(ref)
    db.commit()
    db.refresh(ref)
    return ref

@app.put("/api/references/{reference_id}", response_model=schemas.Reference)
def update_reference(reference_id: int, ref_data: schemas.ReferenceCreate, db: Session = Depends(database.get_db)):
    ref = db.query(models.Reference).filter(models.Reference.id == reference_id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Referans bulunamadı.")
    
    for key, value in ref_data.dict().items():
        setattr(ref, key, value)
    
    db.commit()
    db.refresh(ref)
    return ref

@app.delete("/api/references/{reference_id}")
def delete_reference(reference_id: int, db: Session = Depends(database.get_db)):
    ref = db.query(models.Reference).filter(models.Reference.id == reference_id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Referans bulunamadı.")
    
    db.delete(ref)
    db.commit()
    return {"message": "Referans silindi."}

# ── Upload Endpoint ──

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "images"))
    if not os.path.isdir(images_dir):
        images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "images"))
    os.makedirs(images_dir, exist_ok=True)
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    new_filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(images_dir, new_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"images/{new_filename}"}

# Serve static files
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
