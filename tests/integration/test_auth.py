import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_register_success(client: AsyncClient) -> None:
    resp = await client.post("/api/auth/register", json={
        "email": "new@example.com",
        "password": "strongpass1",
        "name": "New User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@example.com"
    assert "hashed_password" not in data


async def test_register_duplicate_email(client: AsyncClient) -> None:
    payload = {"email": "dup@example.com", "password": "strongpass1", "name": "A"}
    await client.post("/api/auth/register", json=payload)
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409


async def test_login_success(client: AsyncClient) -> None:
    await client.post("/api/auth/register", json={
        "email": "login@example.com",
        "password": "mypassword",
        "name": "Login User",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "mypassword",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient) -> None:
    await client.post("/api/auth/register", json={
        "email": "badpass@example.com",
        "password": "rightpassword",
        "name": "User",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "badpass@example.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


async def test_refresh_token(client: AsyncClient) -> None:
    await client.post("/api/auth/register", json={
        "email": "refresh@example.com",
        "password": "password123",
        "name": "Refresh User",
    })
    login_resp = await client.post("/api/auth/login", json={
        "email": "refresh@example.com",
        "password": "password123",
    })
    refresh_token = login_resp.json()["refresh_token"]

    resp = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_refresh_with_access_token_fails(client: AsyncClient) -> None:
    await client.post("/api/auth/register", json={
        "email": "wrongtype@example.com",
        "password": "password123",
        "name": "Wrong Type",
    })
    login_resp = await client.post("/api/auth/login", json={
        "email": "wrongtype@example.com",
        "password": "password123",
    })
    access_token = login_resp.json()["access_token"]

    resp = await client.post("/api/auth/refresh", json={"refresh_token": access_token})
    assert resp.status_code == 401
