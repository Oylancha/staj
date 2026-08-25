import glob
from bs4 import BeautifulSoup
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import from backend
import sys
sys.path.append('.')
from backend.models import Base, Product

engine = create_engine('sqlite:///sql_app.db')
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

files = glob.glob('items/*.html')

for path in files:
    with open(path, 'r') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
    
    title_elem = soup.find('h1', class_='item-title')
    desc_elem = soup.find('p', class_='item-desc')
    img_elem = soup.find('img', class_='item-img')
    
    if title_elem and desc_elem and img_elem:
        name = title_elem.get_text(strip=True)
        # Check if already exists
        if not db.query(Product).filter(Product.name == name).first():
            desc = desc_elem.get_text(strip=True)
            img_src = img_elem.get('src')
            # Adjust path from '../images/' to 'images/' since it will be served from root
            if img_src.startswith('../'):
                img_src = img_src[3:]
            
            prod = Product(name=name, description=desc, image_url=img_src, parent_id=None)
            db.add(prod)

db.commit()
db.close()
print("Seeding complete.")
