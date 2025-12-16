from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from datetime import timedelta
import uuid

from models.database import User, Organization, OrganizationMember, get_db
from auth.jwt_handler import (
    create_access_token,
    create_user_token,
    get_password_hash,
    verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    org_name: str = None  # Optional custom org name

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    org_id: str = None
    role: str = None

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 1. Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name
    )
    db.add(new_user)
    await db.flush()  # Get ID without committing
    
    # 2. Create default Organization
    org_name = user_data.org_name or f"{user_data.full_name}'s Org"
    # Simple slug generation: name-random
    slug = f"{org_name.lower().replace(' ', '-')}-{str(uuid.uuid4())[:8]}"
    
    new_org = Organization(
        name=org_name,
        slug=slug,
        subscription_plan="free"
    )
    db.add(new_org)
    await db.flush()
    
    # 3. Add User as Owner of Organization
    membership = OrganizationMember(
        organization_id=new_org.id,
        user_id=new_user.id,
        role="owner"
    )
    db.add(membership)
    
    await db.commit()
    await db.refresh(new_user)
    
    # Create access token with Org Context
    access_token = create_user_token(
        user_id=new_user.id,
        email=new_user.email,
        org_id=new_org.id,
        role="owner"
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "org_id": new_org.id,
        "role": "owner"
    }

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    # Find user
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Fetch User's Organization (Default to first one found)
    # In future: Allow user to select org or pass org_id in login
    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    result = await db.execute(stmt)
    membership = result.scalars().first()
    
    org_id = None
    role = None
    
    if membership:
        org_id = membership.organization_id
        role = membership.role
    
    # Create access token
    access_token = create_user_token(
        user_id=user.id,
        email=user.email,
        org_id=org_id,
        role=role,
        is_superuser=user.is_superuser
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "org_id": org_id,
        "role": role
    }
