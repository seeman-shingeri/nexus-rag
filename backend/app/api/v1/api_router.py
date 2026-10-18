from fastapi import APIRouter
from app.api.v1 import auth, health, documents, vision, incidents, events, safety_rules, digital_twin

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(health.router)
api_router.include_router(documents.router)
api_router.include_router(vision.router)
api_router.include_router(incidents.router)
api_router.include_router(events.router)
api_router.include_router(safety_rules.router)
api_router.include_router(digital_twin.router)


