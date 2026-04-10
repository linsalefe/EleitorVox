"""Rotas de Eleitores — CRUD + filtros + importação CSV + stats + geo"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import csv
import io

from app.database import get_db
from app.models import Eleitor, Lideranca, User
from app.auth import get_current_user, get_tenant_id

router = APIRouter(prefix="/api/eleitores", tags=["eleitores"])


# === Schemas ===

class EleitorCreate(BaseModel):
    nome_completo: str
    cpf: Optional[str] = None
    data_nascimento: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    titulo_eleitor: Optional[str] = None
    zona_eleitoral: Optional[str] = None
    secao_eleitoral: Optional[str] = None
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = "PB"
    cep: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    nivel_apoio: Optional[int] = 0
    origem: Optional[str] = None
    lideranca_id: Optional[int] = None
    observacoes: Optional[str] = None
    contact_id: Optional[int] = None


class EleitorUpdate(BaseModel):
    nome_completo: Optional[str] = None
    cpf: Optional[str] = None
    data_nascimento: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    titulo_eleitor: Optional[str] = None
    zona_eleitoral: Optional[str] = None
    secao_eleitoral: Optional[str] = None
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    nivel_apoio: Optional[int] = None
    origem: Optional[str] = None
    lideranca_id: Optional[int] = None
    observacoes: Optional[str] = None


# === Helper: get lideranca_id for current user ===

async def _get_user_lideranca_id(user: User, db: AsyncSession) -> Optional[int]:
    if user.role != "lideranca":
        return None
    lid_q = await db.execute(select(Lideranca).where(Lideranca.user_id == user.id))
    lid = lid_q.scalar_one_or_none()
    return lid.id if lid else None


# === Endpoints ===

@router.post("")
async def criar_eleitor(
    body: EleitorCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    user: User = Depends(get_current_user),
):
    data = body.model_dump(exclude_none=True)
    if "data_nascimento" in data:
        try:
            data["data_nascimento"] = datetime.fromisoformat(data["data_nascimento"])
        except ValueError:
            del data["data_nascimento"]
    eleitor = Eleitor(tenant_id=tenant_id, **data)

    # Se é liderança, vincular automaticamente
    if user.role == "lideranca":
        lid_id = await _get_user_lideranca_id(user, db)
        if lid_id:
            eleitor.lideranca_id = lid_id

    db.add(eleitor)
    await db.commit()
    await db.refresh(eleitor)
    return _serialize(eleitor)


@router.get("")
async def listar_eleitores(
    db: AsyncSession = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    user: User = Depends(get_current_user),
    bairro: Optional[str] = None,
    zona_eleitoral: Optional[str] = None,
    nivel_apoio: Optional[int] = None,
    lideranca_id: Optional[int] = None,
    origem: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    query = select(Eleitor).where(Eleitor.tenant_id == tenant_id)

    # Se é liderança, só vê seus eleitores
    if user.role == "lideranca":
        lid_id = await _get_user_lideranca_id(user, db)
        if lid_id:
            query = query.where(Eleitor.lideranca_id == lid_id)
        else:
            query = query.where(Eleitor.id == -1)  # Não mostra nada

    if bairro:
        query = query.where(Eleitor.bairro == bairro)
    if zona_eleitoral:
        query = query.where(Eleitor.zona_eleitoral == zona_eleitoral)
    if nivel_apoio is not None:
        query = query.where(Eleitor.nivel_apoio == nivel_apoio)
    if lideranca_id:
        query = query.where(Eleitor.lideranca_id == lideranca_id)
    if origem:
        query = query.where(Eleitor.origem == origem)
    if search:
        query = query.where(
            Eleitor.nome_completo.ilike(f"%{search}%") |
            Eleitor.telefone.ilike(f"%{search}%") |
            Eleitor.cpf.ilike(f"%{search}%")
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(Eleitor.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    eleitores = result.scalars().all()

    return {
        "eleitores": [_serialize(e) for e in eleitores],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if total else 0,
    }


@router.get("/stats")
async def stats_eleitores(
    db: AsyncSession = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    user: User = Depends(get_current_user),
):
    base_filter = [Eleitor.tenant_id == tenant_id]
    if user.role == "lideranca":
        lid_id = await _get_user_lideranca_id(user, db)
        if lid_id:
            base_filter.append(Eleitor.lideranca_id == lid_id)
        else:
            return {"total": 0, "por_nivel": {}, "por_bairro": [], "por_zona": [], "por_origem": []}

    total = (await db.execute(select(func.count()).where(*base_filter))).scalar()

    nivel_q = await db.execute(
        select(Eleitor.nivel_apoio, func.count()).where(*base_filter).group_by(Eleitor.nivel_apoio)
    )
    por_nivel = {str(r[0]): r[1] for r in nivel_q.all()}

    bairro_q = await db.execute(
        select(Eleitor.bairro, func.count()).where(*base_filter, Eleitor.bairro.isnot(None))
        .group_by(Eleitor.bairro).order_by(func.count().desc()).limit(15)
    )
    por_bairro = [{"bairro": r[0], "total": r[1]} for r in bairro_q.all()]

    zona_q = await db.execute(
        select(Eleitor.zona_eleitoral, func.count()).where(*base_filter, Eleitor.zona_eleitoral.isnot(None))
        .group_by(Eleitor.zona_eleitoral).order_by(func.count().desc())
    )
    por_zona = [{"zona": r[0], "total": r[1]} for r in zona_q.all()]

    origem_q = await db.execute(
        select(Eleitor.origem, func.count()).where(*base_filter, Eleitor.origem.isnot(None))
        .group_by(Eleitor.origem).order_by(func.count().desc())
    )
    por_origem = [{"origem": r[0], "total": r[1]} for r in origem_q.all()]

    return {"total": total, "por_nivel": por_nivel, "por_bairro": por_bairro, "por_zona": por_zona, "por_origem": por_origem}


@router.get("/dashboard/stats")
async def dashboard_eleitoral(
    db: AsyncSession = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    user: User = Depends(get_current_user),
):
    """Stats eleitorais para o dashboard — total, por nível, por bairro, cadastros recentes."""
    base_filter = [Eleitor.tenant_id == tenant_id]
    if user.role == "lideranca":
        lid_id = await _get_user_lideranca_id(user, db)
        if lid_id:
            base_filter.append(Eleitor.lideranca_id == lid_id)
        else:
            return {"total": 0, "esta_semana": 0, "semana_passada": 0, "trend_pct": 0, "por_nivel": {}, "por_bairro": [], "evolucao_semanal": []}

    # Total
    total = (await db.execute(select(func.count()).where(*base_filter))).scalar()

    # Cadastros esta semana
    week_ago = datetime.utcnow() - timedelta(days=7)
    esta_semana = (await db.execute(
        select(func.count()).where(*base_filter, Eleitor.created_at >= week_ago)
    )).scalar()

    # Semana passada (para trend)
    two_weeks = datetime.utcnow() - timedelta(days=14)
    semana_passada = (await db.execute(
        select(func.count()).where(*base_filter, Eleitor.created_at >= two_weeks, Eleitor.created_at < week_ago)
    )).scalar()

    # Por nível
    nivel_q = await db.execute(
        select(Eleitor.nivel_apoio, func.count()).where(*base_filter).group_by(Eleitor.nivel_apoio)
    )
    por_nivel = {str(r[0]): r[1] for r in nivel_q.all()}

    # Top 10 bairros
    bairro_q = await db.execute(
        select(Eleitor.bairro, func.count()).where(*base_filter, Eleitor.bairro.isnot(None))
        .group_by(Eleitor.bairro).order_by(func.count().desc()).limit(10)
    )
    por_bairro = [{"bairro": r[0], "total": r[1]} for r in bairro_q.all()]

    # Evolução diária (últimos 30 dias)
    thirty_days = datetime.utcnow() - timedelta(days=30)
    evo_q = await db.execute(
        select(cast(Eleitor.created_at, Date), func.count())
        .where(*base_filter, Eleitor.created_at >= thirty_days)
        .group_by(cast(Eleitor.created_at, Date))
        .order_by(cast(Eleitor.created_at, Date))
    )
    evolucao = [{"date": r[0].isoformat(), "count": r[1]} for r in evo_q.all()]

    trend_pct = 0
    if semana_passada > 0:
        trend_pct = round(((esta_semana - semana_passada) / semana_passada) * 100, 1)

    return {
        "total": total,
        "esta_semana": esta_semana,
        "semana_passada": semana_passada,
        "trend_pct": trend_pct,
        "por_nivel": por_nivel,
        "por_bairro": por_bairro,
        "evolucao_semanal": evolucao,
    }


@router.get("/geo/markers")
async def geo_markers(
    db: AsyncSession = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    nivel_apoio: Optional[int] = None,
    bairro: Optional[str] = None,
    lideranca_id: Optional[int] = None,
):
    query = select(
        Eleitor.id, Eleitor.nome_completo, Eleitor.latitude, Eleitor.longitude,
        Eleitor.nivel_apoio, Eleitor.bairro, Eleitor.telefone
    ).where(Eleitor.tenant_id == tenant_id, Eleitor.latitude.isnot(None), Eleitor.longitude.isnot(None))
    if nivel_apoio is not None:
        query = query.where(Eleitor.nivel_apoio == nivel_apoio)
    if bairro:
        query = query.where(Eleitor.bairro == bairro)
    if lideranca_id:
        query = query.where(Eleitor.lideranca_id == lideranca_id)

    result = await db.execute(query)
    return [{"id": r[0], "nome": r[1], "lat": float(r[2]), "lng": float(r[3]), "nivel_apoio": r[4], "bairro": r[5], "telefone": r[6]} for r in result.all()]


@router.get("/{eleitor_id}")
async def detalhe_eleitor(eleitor_id: int, db: AsyncSession = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    result = await db.execute(select(Eleitor).where(Eleitor.id == eleitor_id, Eleitor.tenant_id == tenant_id))
    eleitor = result.scalar_one_or_none()
    if not eleitor:
        raise HTTPException(status_code=404, detail="Eleitor não encontrado")
    return _serialize(eleitor)


@router.put("/{eleitor_id}")
async def atualizar_eleitor(eleitor_id: int, body: EleitorUpdate, db: AsyncSession = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    result = await db.execute(select(Eleitor).where(Eleitor.id == eleitor_id, Eleitor.tenant_id == tenant_id))
    eleitor = result.scalar_one_or_none()
    if not eleitor:
        raise HTTPException(status_code=404, detail="Eleitor não encontrado")
    data = body.model_dump(exclude_none=True)
    if "data_nascimento" in data:
        try:
            data["data_nascimento"] = datetime.fromisoformat(data["data_nascimento"])
        except ValueError:
            del data["data_nascimento"]
    for k, v in data.items():
        setattr(eleitor, k, v)
    await db.commit()
    await db.refresh(eleitor)
    return _serialize(eleitor)


@router.delete("/{eleitor_id}")
async def remover_eleitor(eleitor_id: int, db: AsyncSession = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    result = await db.execute(select(Eleitor).where(Eleitor.id == eleitor_id, Eleitor.tenant_id == tenant_id))
    eleitor = result.scalar_one_or_none()
    if not eleitor:
        raise HTTPException(status_code=404, detail="Eleitor não encontrado")
    await db.delete(eleitor)
    await db.commit()
    return {"status": "ok"}


@router.post("/import-csv")
async def importar_csv(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Envie um arquivo .csv")
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    created = 0
    errors = []
    for i, row in enumerate(reader, start=2):
        nome = (row.get("nome_completo") or row.get("nome") or "").strip()
        if not nome:
            errors.append(f"Linha {i}: nome vazio")
            continue
        eleitor = Eleitor(
            tenant_id=tenant_id, nome_completo=nome,
            telefone=(row.get("telefone") or "").strip() or None,
            cpf=(row.get("cpf") or "").strip() or None,
            bairro=(row.get("bairro") or "").strip() or None,
            cidade=(row.get("cidade") or "").strip() or None,
            estado=(row.get("estado") or "PB").strip(),
            zona_eleitoral=(row.get("zona_eleitoral") or row.get("zona") or "").strip() or None,
            secao_eleitoral=(row.get("secao_eleitoral") or row.get("secao") or "").strip() or None,
            endereco=(row.get("endereco") or "").strip() or None,
            cep=(row.get("cep") or "").strip() or None,
            nivel_apoio=int(row.get("nivel_apoio") or 0),
            origem=(row.get("origem") or "csv").strip(),
            observacoes=(row.get("observacoes") or "").strip() or None,
        )
        db.add(eleitor)
        created += 1
    await db.commit()
    return {"importados": created, "erros": errors}


def _serialize(e: Eleitor) -> dict:
    return {
        "id": e.id, "tenant_id": e.tenant_id, "contact_id": e.contact_id,
        "nome_completo": e.nome_completo, "cpf": e.cpf,
        "data_nascimento": e.data_nascimento.isoformat() if e.data_nascimento else None,
        "telefone": e.telefone, "email": e.email, "foto_url": e.foto_url,
        "titulo_eleitor": e.titulo_eleitor, "zona_eleitoral": e.zona_eleitoral, "secao_eleitoral": e.secao_eleitoral,
        "endereco": e.endereco, "bairro": e.bairro, "cidade": e.cidade, "estado": e.estado, "cep": e.cep,
        "latitude": float(e.latitude) if e.latitude else None, "longitude": float(e.longitude) if e.longitude else None,
        "nivel_apoio": e.nivel_apoio, "origem": e.origem, "lideranca_id": e.lideranca_id,
        "observacoes": e.observacoes,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "updated_at": e.updated_at.isoformat() if e.updated_at else None,
    }
