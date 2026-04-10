"""Rotas de Lideranças — CRUD + hierarquia + ranking"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import Lideranca, Eleitor
from app.auth import get_current_user, get_tenant_id

router = APIRouter(prefix="/api/liderancas", tags=["liderancas"])


class LiderancaCreate(BaseModel):
    nome: str
    telefone: Optional[str] = None
    email: Optional[str] = None
    tipo: str = "cabo_eleitoral"
    regiao: Optional[str] = None
    lideranca_pai_id: Optional[int] = None
    meta_eleitores: int = 0
    user_id: Optional[int] = None


class LiderancaUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    tipo: Optional[str] = None
    regiao: Optional[str] = None
    lideranca_pai_id: Optional[int] = None
    meta_eleitores: Optional[int] = None
    is_active: Optional[bool] = None
    user_id: Optional[int] = None


@router.post("")
async def criar_lideranca(body: LiderancaCreate, db: AsyncSession = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    lid = Lideranca(tenant_id=tenant_id, **body.model_dump(exclude_none=True))
    db.add(lid)
    await db.commit()
    await db.refresh(lid)
    return await _serialize(lid, db)


@router.get("")
async def listar_liderancas(db: AsyncSession = Depends(get_db), tenant_id: int = Depends(get_tenant_id), tipo: Optional[str] = None):
    query = select(Lideranca).where(Lideranca.tenant_id == tenant_id, Lideranca.is_active == True).order_by(Lideranca.nome)
    if tipo:
        query = query.where(Lideranca.tipo == tipo)
    result = await db.execute(query)
    items = []
    for l in result.scalars().all():
        items.append(await _serialize(l, db))
    return {"liderancas": items}


@router.get("/ranking")
async def ranking(db: AsyncSession = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    query = (
        select(Lideranca.id, Lideranca.nome, Lideranca.tipo, Lideranca.regiao, Lideranca.meta_eleitores, func.count(Eleitor.id).label("total"))
        .outerjoin(Eleitor, Eleitor.lideranca_id == Lideranca.id)
        .where(Lideranca.tenant_id == tenant_id, Lideranca.is_active == True)
        .group_by(Lideranca.id).order_by(func.count(Eleitor.id).desc())
    )
    result = await db.execute(query)
    return [{"id": r[0], "nome": r[1], "tipo": r[2], "regiao": r[3], "meta": r[4], "total_eleitores": r[5],
             "percentual": round((r[5] / r[4]) * 100, 1) if r[4] > 0 else 0} for r in result.all()]


@router.get("/hierarquia")
async def hierarquia(db: AsyncSession = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    result = await db.execute(select(Lideranca).where(Lideranca.tenant_id == tenant_id, Lideranca.is_active == True))
    todas = result.scalars().all()
    count_q = await db.execute(select(Eleitor.lideranca_id, func.count()).where(Eleitor.tenant_id == tenant_id).group_by(Eleitor.lideranca_id))
    contagem = {r[0]: r[1] for r in count_q.all()}
    def build(pai_id):
        return [{"id": l.id, "nome": l.nome, "tipo": l.tipo, "regiao": l.regiao, "meta": l.meta_eleitores,
                 "total_eleitores": contagem.get(l.id, 0), "filhos": build(l.id)}
                for l in todas if l.lideranca_pai_id == pai_id]
    return build(None)


@router.get("/{lid_id}")
async def detalhe(lid_id: int, db: AsyncSession = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    result = await db.execute(select(Lideranca).where(Lideranca.id == lid_id, Lideranca.tenant_id == tenant_id))
    lid = result.scalar_one_or_none()
    if not lid:
        raise HTTPException(status_code=404, detail="Liderança não encontrada")
    return await _serialize(lid, db)


@router.put("/{lid_id}")
async def atualizar(lid_id: int, body: LiderancaUpdate, db: AsyncSession = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    result = await db.execute(select(Lideranca).where(Lideranca.id == lid_id, Lideranca.tenant_id == tenant_id))
    lid = result.scalar_one_or_none()
    if not lid:
        raise HTTPException(status_code=404, detail="Liderança não encontrada")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(lid, k, v)
    await db.commit()
    await db.refresh(lid)
    return await _serialize(lid, db)


@router.delete("/{lid_id}")
async def remover(lid_id: int, db: AsyncSession = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    result = await db.execute(select(Lideranca).where(Lideranca.id == lid_id, Lideranca.tenant_id == tenant_id))
    lid = result.scalar_one_or_none()
    if not lid:
        raise HTTPException(status_code=404, detail="Liderança não encontrada")
    await db.delete(lid)
    await db.commit()
    return {"status": "ok"}


async def _serialize(l: Lideranca, db: AsyncSession) -> dict:
    total = (await db.execute(select(func.count()).where(Eleitor.lideranca_id == l.id))).scalar()
    return {
        "id": l.id, "tenant_id": l.tenant_id, "user_id": l.user_id,
        "nome": l.nome, "telefone": l.telefone, "email": l.email,
        "tipo": l.tipo, "regiao": l.regiao, "lideranca_pai_id": l.lideranca_pai_id,
        "meta_eleitores": l.meta_eleitores, "total_eleitores": total,
        "percentual": round((total / l.meta_eleitores) * 100, 1) if l.meta_eleitores > 0 else 0,
        "is_active": l.is_active,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    }
