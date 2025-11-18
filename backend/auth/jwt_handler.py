“””
JWT Authentication Handler
Handles user authentication, token generation and validation
“””
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
import os

# Password hashing

pwd_context = CryptContext(schemes=[“bcrypt”], deprecated=“auto”)

# JWT Configuration

SECRET_KEY = os.getenv(“SECRET_KEY”, “your-secret-key-change-in-production”)
ALGORITHM = “HS256”
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def verify_password(plain_password: str, hashed_password: str) -> bool:
“”“Verify a password against its hash”””
return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
“”“Hash a password”””
return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
“””
Create a new JWT access token

```
Args:
    data: Data to encode in the token (user_id, email, etc.)
    expires_delta: Optional expiration time

Returns:
    Encoded JWT token string
"""
to_encode = data.copy()

if expires_delta:
    expire = datetime.utcnow() + expires_delta
else:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

to_encode.update({
    "exp": expire,
    "iat": datetime.utcnow(),
    "type": "access"
})

encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
return encoded_jwt
```

def decode_access_token(token: str) -> Dict[str, Any]:
“””
Decode and validate a JWT token

```
Args:
    token: JWT token string

Returns:
    Decoded token payload

Raises:
    HTTPException: If token is invalid or expired
"""
try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload
except jwt.ExpiredSignatureError:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token has expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
except jwt.InvalidTokenError:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token",
        headers={"WWW-Authenticate": "Bearer"},
    )
```

def create_user_token(user_id: str, email: str, is_superuser: bool = False) -> str:
“””
Create an access token for a user

```
Args:
    user_id: User's unique identifier
    email: User's email
    is_superuser: Whether user has superuser privileges

Returns:
    JWT token string
"""
token_data = {
    "sub": user_id,
    "email": email,
    "is_superuser": is_superuser
}
return create_access_token(token_data)
```

def validate_token(token: str) -> Dict[str, Any]:
“””
Validate a token and return user information

```
Args:
    token: JWT token string

Returns:
    User information from token
"""
payload = decode_access_token(token)

user_id = payload.get("sub")
if user_id is None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token payload"
    )

return {
    "user_id": user_id,
    "email": payload.get("email"),
    "is_superuser": payload.get("is_superuser", False)
}
```
