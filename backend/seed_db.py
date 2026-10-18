import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
import app.models
from app.models.user import User, UserRole
from app.models.zone import Zone
from app.models.camera import CameraSource
from app.models.rule import SafetyRule, RuleSeverity
from app.models.event import DetectionCategory
from app.models.digital_twin import DigitalTwinObject

async def seed_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(select(User).where(User.username == "admin"))
        if result.scalar_one_or_none():
            print("[INFO] Database already contains initial seed data.")
            return

        print("[INFO] Seeding initial users...")
        users = [
            User(
                username="admin",
                email="admin@nexus.ai",
                full_name="Nexus System Administrator",
                hashed_password=get_password_hash("NexusAdmin@2026"),
                role=UserRole.ADMIN,
                is_active=True
            ),
            User(
                username="safety_officer",
                email="officer@nexus.ai",
                full_name="Elena Rostova (Chief Safety Officer)",
                hashed_password=get_password_hash("OfficerSafety@2026"),
                role=UserRole.SAFETY_OFFICER,
                is_active=True
            ),
            User(
                username="operator_duty",
                email="operator@nexus.ai",
                full_name="Marcus Vance (Ops Controller)",
                hashed_password=get_password_hash("OperatorDuty@2026"),
                role=UserRole.OPERATOR,
                is_active=True
            ),
            User(
                username="auditor",
                email="auditor@nexus.ai",
                full_name="Sarah Chen (Compliance Auditor)",
                hashed_password=get_password_hash("AuditorVerify@2026"),
                role=UserRole.VIEWER,
                is_active=True
            ),
        ]
        session.add_all(users)
        await session.commit()

        print("[INFO] Seeding facility zones...")
        zones = [
            Zone(
                name="Zone A - Heavy Machinery Bay",
                description="Assembly floor with high-voltage robotics and CNC mills.",
                risk_level="HIGH",
                is_restricted=False,
                max_occupancy=8,
                expected_conditions="Mandatory hardhats and high-visibility vests. No unescorted visitors.",
                polygon_coords="[[0.1, 0.1], [0.45, 0.1], [0.45, 0.5], [0.1, 0.5]]"
            ),
            Zone(
                name="Zone B - Chemical Storage Vault",
                description="Secure pressurized containment for solvents, acids, and lubricants.",
                risk_level="CRITICAL",
                is_restricted=True,
                max_occupancy=2,
                expected_conditions="Restricted access. Vapor-tight containment. Spill response kits must be unobstructed.",
                polygon_coords="[[0.5, 0.1], [0.9, 0.1], [0.9, 0.45], [0.5, 0.45]]"
            ),
            Zone(
                name="Zone C - Loading Dock & Forklift Corridor",
                description="Intermodal freight bay with active forklift traffic.",
                risk_level="HIGH",
                is_restricted=False,
                max_occupancy=15,
                expected_conditions="Forklift speed limit 8 km/h. Pedestrian walkways must remain clear of debris.",
                polygon_coords="[[0.1, 0.55], [0.5, 0.55], [0.5, 0.9], [0.1, 0.9]]"
            ),
            Zone(
                name="Zone D - Central Walkway & Emergency Exit",
                description="Primary egress route leading to external muster point 1.",
                risk_level="MEDIUM",
                is_restricted=False,
                max_occupancy=25,
                expected_conditions="Egress must remain completely unobstructed at all times.",
                polygon_coords="[[0.55, 0.5], [0.9, 0.5], [0.9, 0.9], [0.55, 0.9]]"
            ),
        ]
        session.add_all(zones)
        await session.commit()

        print("[INFO] Seeding camera sources...")
        cameras = [
            CameraSource(
                name="CAM-01: Overhead Assembly North",
                stream_url="0",
                location="Zone A - Ceiling Mount",
                is_active=True,
                is_demo=False,
                resolution="1920x1080",
                fps=25,
                zone_id=1
            ),
            CameraSource(
                name="CAM-02: Chemical Vault Entry",
                stream_url="demo_vault",
                location="Zone B - Doorway High-Angle",
                is_active=True,
                is_demo=True,
                resolution="1280x720",
                fps=15,
                zone_id=2
            ),
            CameraSource(
                name="CAM-03: Loading Bay Corridor",
                stream_url="demo_loading",
                location="Zone C - Perimeter Pillar",
                is_active=True,
                is_demo=True,
                resolution="1920x1080",
                fps=30,
                zone_id=3
            ),
            CameraSource(
                name="CAM-04: Emergency Egress Corridor",
                stream_url="demo_egress",
                location="Zone D - Exit Portal",
                is_active=True,
                is_demo=True,
                resolution="1280x720",
                fps=15,
                zone_id=4
            ),
        ]
        session.add_all(cameras)
        await session.commit()

        print("[INFO] Seeding deterministic safety rules...")
        rules = [
            SafetyRule(
                name="RULE-SPILL-01: Liquid Spill Detection Near Heavy Machinery",
                description="Detects puddles, liquid pooling, or lubricant discharge near energized equipment.",
                category=DetectionCategory.LIQUID_SPILL,
                severity=RuleSeverity.HIGH,
                confidence_threshold=0.65,
                persistence_seconds=3,
                cooldown_minutes=5,
                zone_id=1,
                is_active=True,
                requires_human_approval=True,
                standard_procedure="SOP-ENV-204: Deploy sorbent booms immediately, isolate equipment electrical feed, and alert environmental control."
            ),
            SafetyRule(
                name="RULE-RESTRICT-02: Unauthorized Intrusion into Chemical Vault",
                description="Triggers when personnel enter Zone B without verified clearance badge.",
                category=DetectionCategory.PERSON,
                severity=RuleSeverity.CRITICAL,
                confidence_threshold=0.75,
                persistence_seconds=2,
                cooldown_minutes=3,
                zone_id=2,
                is_active=True,
                requires_human_approval=True,
                standard_procedure="SOP-SEC-101: Broadcast audio warning, verify authorization manifest with security dispatch, initiate lockdown if unverified."
            ),
            SafetyRule(
                name="RULE-EGRESS-03: Blocked Emergency Exit Corridor",
                description="Detects pallets, machinery, or debris obstructing primary egress in Zone D.",
                category=DetectionCategory.BLOCKED_EXIT,
                severity=RuleSeverity.CRITICAL,
                confidence_threshold=0.70,
                persistence_seconds=4,
                cooldown_minutes=10,
                zone_id=4,
                is_active=True,
                requires_human_approval=True,
                standard_procedure="SOP-FIRE-008: Immediate verbal warning over PA system, dispatch floor marshal to clear egress pathway within 60 seconds."
            ),
            SafetyRule(
                name="RULE-PPE-04: Missing Hardhat in Active Crane & Machinery Area",
                description="Flags workers without compliant head protection under suspended load areas.",
                category=DetectionCategory.MISSING_PPE_HELMET,
                severity=RuleSeverity.MEDIUM,
                confidence_threshold=0.70,
                persistence_seconds=3,
                cooldown_minutes=5,
                zone_id=1,
                is_active=True,
                requires_human_approval=False,
                standard_procedure="SOP-PPE-003: Direct worker to nearest PPE kiosk; notify shift supervisor if non-compliance exceeds 2 minutes."
            ),
            SafetyRule(
                name="RULE-SMOKE-05: Visual Suspicion of Thermal / Smoke Plume",
                description="Visual detection of smoke plume or rapid haze (Note: Visual suspicion only; not certified life safety detector).",
                category=DetectionCategory.FIRE_SMOKE_SUSPICION,
                severity=RuleSeverity.CRITICAL,
                confidence_threshold=0.60,
                persistence_seconds=2,
                cooldown_minutes=5,
                zone_id=None,  # All zones
                is_active=True,
                requires_human_approval=True,
                standard_procedure="SOP-HAZ-001: Cross-check with certified optical smoke detectors, activate facility muster siren, notify incident commander."
            ),
        ]
        session.add_all(rules)
        await session.commit()

        print("[INFO] Seeding digital twin assets...")
        twin_assets = [
            DigitalTwinObject(
                zone_id=1,
                name="Hydraulic Press HP-400",
                object_type="equipment",
                expected_present=True,
                is_discrepancy=False
            ),
            DigitalTwinObject(
                zone_id=1,
                name="Emergency Eye Wash Station EW-01",
                object_type="spill_kit",
                expected_present=True,
                is_discrepancy=False
            ),
            DigitalTwinObject(
                zone_id=2,
                name="Acid Neutralizer Station NS-02",
                object_type="spill_kit",
                expected_present=True,
                is_discrepancy=False
            ),
            DigitalTwinObject(
                zone_id=2,
                name="Class D Halon Extinguisher FX-09",
                object_type="extinguisher",
                expected_present=True,
                is_discrepancy=False
            ),
            DigitalTwinObject(
                zone_id=4,
                name="Fire Exit Door ED-04",
                object_type="barrier",
                expected_present=True,
                is_discrepancy=False
            ),
        ]
        session.add_all(twin_assets)
        await session.commit()

        print("[SUCCESS] Initial seed data created successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
