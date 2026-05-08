from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def _setup_and_create_task(client: AsyncClient, email: str) -> tuple[str, str]:
    """Register + login a user, create a task, return (access_token, task_id)."""
    await client.post("/api/auth/register", json={
        "email": email, "password": "password123", "name": "Share User"
    })
    login = await client.post("/api/auth/login", json={"email": email, "password": "password123"})
    token = login.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    task_resp = await client.post("/api/tasks", json={"title": "Shared Task"})
    task_id = task_resp.json()["id"]
    return token, task_id


async def test_create_share_token(client: AsyncClient) -> None:
    _, task_id = await _setup_and_create_task(client, "shareowner@example.com")

    with patch("app.api.routes.share.send_share_email", new_callable=AsyncMock):
        resp = await client.post(f"/api/share/{task_id}", json={"recipient_email": "recipient@example.com"})

    assert resp.status_code == 201
    data = resp.json()
    assert "token" in data
    assert data["recipient_email"] == "recipient@example.com"


async def test_view_shared_task_public(client: AsyncClient) -> None:
    _, task_id = await _setup_and_create_task(client, "owner2@example.com")

    with patch("app.api.routes.share.send_share_email", new_callable=AsyncMock):
        share_resp = await client.post(f"/api/share/{task_id}", json={"recipient_email": "r@example.com"})

    token = share_resp.json()["token"]

    # Public access — clear auth header
    client.headers.pop("Authorization", None)
    resp = await client.get(f"/api/share/{token}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["task"]["title"] == "Shared Task"
    assert data["shared_by"] == "Share User"


async def test_invalid_share_token_returns_404(client: AsyncClient) -> None:
    client.headers.pop("Authorization", None)
    resp = await client.get("/api/share/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


async def test_share_nonexistent_task_returns_404(client: AsyncClient) -> None:
    _, _ = await _setup_and_create_task(client, "owner3@example.com")

    resp = await client.post(
        "/api/share/00000000-0000-0000-0000-000000000000",
        json={"recipient_email": "r@example.com"},
    )
    assert resp.status_code == 404


async def test_share_another_users_task_returns_403(client: AsyncClient) -> None:
    # User A creates task
    await client.post("/api/auth/register", json={
        "email": "own403@example.com", "password": "password123", "name": "Owner"
    })
    login_a = await client.post("/api/auth/login", json={"email": "own403@example.com", "password": "password123"})
    client.headers["Authorization"] = f"Bearer {login_a.json()['access_token']}"
    task_resp = await client.post("/api/tasks", json={"title": "A Task"})
    task_id = task_resp.json()["id"]

    # User B tries to share User A's task
    await client.post("/api/auth/register", json={
        "email": "other403@example.com", "password": "password123", "name": "Other"
    })
    login_b = await client.post("/api/auth/login", json={"email": "other403@example.com", "password": "password123"})
    client.headers["Authorization"] = f"Bearer {login_b.json()['access_token']}"

    resp = await client.post(f"/api/share/{task_id}", json={"recipient_email": "r@example.com"})
    assert resp.status_code == 403
