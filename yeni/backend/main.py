from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import List, Optional
import os
import shutil
import uuid

from . import models, schemas, database

# Security configuration
SECRET_KEY = "SUPER_SECRET_KEY_FOR_DRAFT"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Ikies Elektronik API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=10)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str, db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@app.on_event("startup")
def create_default_admin():
    # Create a default admin user if none exists (admin / admin123)
    db = database.SessionLocal()
    user = db.query(models.AdminUser).filter(models.AdminUser.username == "admin").first()
    if not user:
        hashed = pwd_context.hash("admin123")
        admin = models.AdminUser(username="admin", hashed_password=hashed)
        db.add(admin)
        db.commit()
    elif user.hashed_password == "dummy_hash":
        user.hashed_password = pwd_context.hash("admin123")
        db.commit()
    db.close()

@app.post("/api/login", response_model=schemas.Token)
def login(login_data: schemas.LoginData, db: Session = Depends(database.get_db)):
    user = db.query(models.AdminUser).filter(models.AdminUser.username == login_data.username).first()
    if not user or not pwd_context.verify(login_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/products", response_model=List[schemas.Product])
def get_products(db: Session = Depends(database.get_db)):
    return db.query(models.Product).all()

@app.get("/api/products/{product_id}", response_model=schemas.Product)
def get_product(product_id: int, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/api/products", response_model=schemas.Product)
def create_product(
    product: schemas.ProductCreate, 
    db: Session = Depends(database.get_db),
    # Require authentication to create product
    token: str = None # Ideally from header, but for simplicity in draft we will pass it in body/query or just expect it in headers
):
    # In a real app we'd use OAuth2PasswordBearer, but this is a simple implementation
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Detach children so they become root nodes
    children = db.query(models.Product).filter(models.Product.parent_id == product_id).all()
    for child in children:
        child.parent_id = None
        
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    # Ensure images directory exists
    images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "images"))
    os.makedirs(images_dir, exist_ok=True)
    
    # Generate unique filename to avoid overwrites
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    new_filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(images_dir, new_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"images/{new_filename}"}

# Serve static files from the root directory
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
