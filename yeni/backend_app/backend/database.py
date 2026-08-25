import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sql_app.db"))
DEFAULT_DB_URL = f"sqlite:///{DB_PATH}"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
