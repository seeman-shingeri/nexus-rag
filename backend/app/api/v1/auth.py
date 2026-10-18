from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import User, UserRole
from app.schemas.token import Token, LoginRequest
from app.schemas.user import UserResponse, UserCreate
from app.api.deps import get_current_user, require_roles, log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    query = select(User).where(
        or_(
            User.username == login_data.username_or_email,
            User.email == login_data.username_or_email
        )
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    access_token = create_access_token(subject=user.username, role=user.role.value)

    # Log audit event
    await log_audit_event(
        db=db,
        user_id=user.username,
        action="LOGIN",
        resource_type="USER",
        resource_id=str(user.id),
        details=f"Successful login for {user.username} with role {user.role.value}",
        ip_address=request.client.host if request.client else None
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        username=user.username
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/register", response_model=UserResponse, dependencies=[Depends(require_roles([UserRole.ADMIN]))])
async def register_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(User).where(
        or_(User.username == user_in.username, User.email == user_in.email)
    )
    result = await db.execute(query)
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username or email already exists"
        )

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        role=user_in.role,
        is_active=user_in.is_active,
        hashed_password=get_password_hash(user_in.password)
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    await log_audit_event(
        db=db,
        user_id=current_user.username,
        action="CREATE_USER",
        resource_type="USER",
        resource_id=str(new_user.id),
        details=f"Created user {new_user.username} with role {new_user.role.value}"
    )

    return new_user
