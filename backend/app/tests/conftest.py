import asyncio
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.user import User, UserRole
from main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False}
)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="function")
async def db_session():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        # Seed test admin
        admin = User(
            username="admin_test",
            email="admin_test@nexus.ai",
            hashed_password=get_password_hash("AdminPass123"),
            role=UserRole.ADMIN,
            is_active=True
        )
        officer = User(
            username="officer_test",
            email="officer_test@nexus.ai",
            hashed_password=get_password_hash("OfficerPass123"),
            role=UserRole.SAFETY_OFFICER,
            is_active=True
        )
        operator = User(
            username="operator_test",
            email="operator_test@nexus.ai",
            hashed_password=get_password_hash("OperatorPass123"),
            role=UserRole.OPERATOR,
            is_active=True
        )
        session.add_all([admin, officer, operator])
        await session.commit()
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture
def admin_token():
    return create_access_token(subject="admin_test", role=UserRole.ADMIN.value)

@pytest.fixture
def operator_token():
    return create_access_token(subject="operator_test", role=UserRole.OPERATOR.value)
