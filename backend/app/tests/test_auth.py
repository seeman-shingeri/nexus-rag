import pytest
from app.core.security import verify_password, get_password_hash

@pytest.mark.asyncio
async def test_password_hashing():
    password = "MySecurePassword2026!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

@pytest.mark.asyncio
async def test_login_success(client):
    response = await client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin_test", "password": "AdminPass123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "ADMIN"
    assert data["username"] == "admin_test"

@pytest.mark.asyncio
async def test_login_invalid_password(client):
    response = await client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin_test", "password": "WrongPassword"}
    )
    assert response.status_code == 401
    assert "Incorrect username/email or password" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_me_authenticated(client, admin_token):
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin_test"
    assert data["role"] == "ADMIN"

@pytest.mark.asyncio
async def test_get_me_unauthenticated(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_rbac_register_user_admin_allowed(client, admin_token):
    response = await client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "username": "new_technician",
            "email": "tech@nexus.ai",
            "full_name": "New Tech",
            "role": "OPERATOR",
            "password": "TechPassword2026",
            "is_active": True
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "new_technician"
    assert data["role"] == "OPERATOR"

@pytest.mark.asyncio
async def test_rbac_register_user_operator_forbidden(client, operator_token):
    response = await client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {operator_token}"},
        json={
            "username": "unauthorized_user",
            "email": "hacker@nexus.ai",
            "full_name": "Unauthorized",
            "role": "OPERATOR",
            "password": "Password123",
            "is_active": True
        }
    )
    assert response.status_code == 403
    assert "Operation not permitted" in response.json()["detail"]
