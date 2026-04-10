from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import User
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "atendente"


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Usuário inativo")

    # Verificar se tenant está ativo
    tenant_features = {}
    if user.tenant_id:
        from app.models import Tenant
        tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant = tenant_result.scalar_one_or_none()
        if tenant:
            if not tenant.is_active:
                raise HTTPException(status_code=403, detail="Conta suspensa. Entre em contato com o suporte.")
            tenant_features = tenant.features or {}

    token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "tenant_id": user.tenant_id,
    })

    # Checar lideranca_id
    lideranca_id = None
    if user.role == "lideranca":
        from app.models import Lideranca
        lid_result = await db.execute(select(Lideranca).where(Lideranca.user_id == user.id))
        lid = lid_result.scalar_one_or_none()
        if lid:
            lideranca_id = lid.id

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "tenant_id": user.tenant_id,
            "features": tenant_features,
            "lideranca_id": lideranca_id,
        },
    }

@router.get("/me")
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tenant_features = {}
    if user.tenant_id:
        from app.models import Tenant
        tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant = tenant_result.scalar_one_or_none()
        if tenant:
            tenant_features = tenant.features or {}

    # Checar se é liderança
    lideranca_id = None
    if user.role == "lideranca":
        from app.models import Lideranca
        lid_result = await db.execute(select(Lideranca).where(Lideranca.user_id == user.id, Lideranca.tenant_id == user.tenant_id))
        lid = lid_result.scalar_one_or_none()
        if lid:
            lideranca_id = lid.id

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "tenant_id": user.tenant_id,
        "features": tenant_features,
        "lideranca_id": lideranca_id,
    }


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Apenas admin pode criar usuários
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar usuários")

    # Verificar se email já existe
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    user = User(
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role,
        tenant_id=current_user.tenant_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Se role = lideranca, criar registro de Lideranca vinculado
    if user.role == "lideranca":
        from app.models import Lideranca
        lid = Lideranca(
            tenant_id=user.tenant_id,
            user_id=user.id,
            nome=user.name,
            tipo="cabo_eleitoral",
        )
        db.add(lid)
        await db.commit()

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Apenas administradores")

    query = select(User).order_by(User.name)
    if current_user.tenant_id:
        query = query.where(User.tenant_id == current_user.tenant_id)

    result = await db.execute(query)
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "tenant_id": u.tenant_id,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.patch("/users/{user_id}")
async def toggle_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Apenas administradores")

    query = select(User).where(User.id == user_id)
    if current_user.tenant_id:
        query = query.where(User.tenant_id == current_user.tenant_id)

    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user.is_active = not user.is_active
    await db.commit()
    return {"id": user.id, "is_active": user.is_active}


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    req: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edição completa de usuário — admin pode alterar nome, email, senha, role, is_active."""
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Apenas administradores")

    query = select(User).where(User.id == user_id)
    if current_user.role != "superadmin":
        query = query.where(User.tenant_id == current_user.tenant_id)

    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if req.name is not None:
        user.name = req.name
    if req.email is not None:
        existing = await db.execute(select(User).where(User.email == req.email, User.id != user_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email já em uso por outro usuário")
        user.email = req.email
    if req.password is not None and req.password.strip():
        user.password_hash = hash_password(req.password)
    if req.role is not None:
        user.role = req.role
    if req.is_active is not None:
        user.is_active = req.is_active

    await db.commit()
    await db.refresh(user)

    # Se role = lideranca, verificar se já existe Lideranca vinculada, senão criar
    if user.role == "lideranca":
        from app.models import Lideranca
        lid_result = await db.execute(select(Lideranca).where(Lideranca.user_id == user.id))
        lid = lid_result.scalar_one_or_none()
        if not lid:
            lid = Lideranca(
                tenant_id=user.tenant_id,
                user_id=user.id,
                nome=user.name,
                tipo="cabo_eleitoral",
            )
            db.add(lid)
            await db.commit()

    return {
        "id": user.id, "name": user.name, "email": user.email,
        "role": user.role, "is_active": user.is_active,
    }