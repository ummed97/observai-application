from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth.jwt_handler import validate_token

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate JWT token"""
    return validate_token(credentials.credentials)

class RoleChecker:
    """RBAC Dependency"""
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: dict = Depends(get_current_user)):
        if not user.get("role"):
             # If no role in token, assume viewer or deny? 
             # For now, if role is required but missing, deny.
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No role assigned in current context")
             
        if user["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"Operation not permitted. Required roles: {self.allowed_roles}"
            )
        return user
