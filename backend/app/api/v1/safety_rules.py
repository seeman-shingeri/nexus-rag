from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.rule import SafetyRule, RuleSeverity
from app.models.event import DetectionCategory
from app.schemas.rule import (
    SafetyRuleCreate,
    SafetyRuleUpdate,
    SafetyRuleResponse,
    RuleSimulationRequest,
    RuleSimulationResponse
)
from app.services.safety_engine import SafetyEngine
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/safety-rules", tags=["Deterministic Safety Rules Engine"])

@router.get("", response_model=List[SafetyRuleResponse])
async def list_safety_rules(
    category: Optional[DetectionCategory] = None,
    severity: Optional[RuleSeverity] = None,
    is_active: Optional[bool] = None,
    zone_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(SafetyRule)
    conditions = []
    if category:
        conditions.append(SafetyRule.category == category)
    if severity:
        conditions.append(SafetyRule.severity == severity)
    if is_active is not None:
        conditions.append(SafetyRule.is_active == is_active)
    if zone_id:
        conditions.append(SafetyRule.zone_id == zone_id)

    if conditions:
        query = query.where(and_(*conditions))
    query = query.order_by(SafetyRule.id)

    res = await db.execute(query)
    return res.scalars().all()

@router.get("/{rule_id}", response_model=SafetyRuleResponse)
async def get_safety_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(SafetyRule).where(SafetyRule.id == rule_id)
    res = await db.execute(query)
    rule = res.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Safety rule not found")
    return rule

@router.post("", response_model=SafetyRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_safety_rule(
    rule_in: SafetyRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER]))
):
    # Check for name uniqueness
    existing_query = select(SafetyRule).where(SafetyRule.name == rule_in.name)
    existing_res = await db.execute(existing_query)
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A safety rule with this name already exists")

    new_rule = SafetyRule(
        name=rule_in.name,
        description=rule_in.description,
        category=rule_in.category,
        severity=rule_in.severity,
        confidence_threshold=rule_in.confidence_threshold,
        persistence_seconds=rule_in.persistence_seconds,
        cooldown_minutes=rule_in.cooldown_minutes,
        zone_id=rule_in.zone_id,
        is_active=rule_in.is_active,
        requires_human_approval=rule_in.requires_human_approval,
        standard_procedure=rule_in.standard_procedure
    )
    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)
    return new_rule

@router.put("/{rule_id}", response_model=SafetyRuleResponse)
async def update_safety_rule(
    rule_id: int,
    rule_update: SafetyRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER]))
):
    query = select(SafetyRule).where(SafetyRule.id == rule_id)
    res = await db.execute(query)
    rule = res.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Safety rule not found")

    update_dict = rule_update.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(rule, field, val)

    await db.commit()
    await db.refresh(rule)
    return rule

@router.delete("/{rule_id}", status_code=status.HTTP_200_OK)
async def delete_safety_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = select(SafetyRule).where(SafetyRule.id == rule_id)
    res = await db.execute(query)
    rule = res.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Safety rule not found")

    await db.delete(rule)
    await db.commit()
    return {"status": "success", "message": f"Rule {rule_id} deleted successfully"}

@router.post("/simulate", response_model=RuleSimulationResponse)
async def simulate_rule(
    req: RuleSimulationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await SafetyEngine.simulate_rule(db=db, req=req)
