from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from passlib.context import CryptContext
from app.database import get_db
from app.models.user import User
from pydantic import BaseModel
from app.core.security import create_access_token

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserCreate(BaseModel):
    full_name: str
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(User).filter(User.username == user.username))
        existing_user = result.scalars().first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already registered")
        truncated_password = user.password.encode("utf-8")[:72].decode("utf-8", "ignore")
        new_user = User(
            full_name=user.full_name,
            username=user.username,
            hashed_password=pwd_context.hash(truncated_password)
        )
        db.add(new_user)
        await db.commit()
        return {"message": "User registered successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login", response_model=Token)
async def login(user: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(User).filter(
                User.username == user.username,
                User.full_name == user.full_name
            )
        )
        existing_user = result.scalars().first()
        if not existing_user:
            raise HTTPException(status_code=401, detail="Invalid username, full name, or password")
        truncated_password = user.password.encode("utf-8")[:72].decode("utf-8", "ignore")
        if not pwd_context.verify(truncated_password, existing_user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid username, full name, or password")
        access_token = create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
