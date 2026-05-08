import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def _create_task(client: AsyncClient, title: str = "My Task") -> dict:
    resp = await client.post("/api/tasks", json={"title": title, "description": "desc"})
    assert resp.status_code == 201
    return resp.json()


async def test_create_task(auth_client: AsyncClient) -> None:
    task = await _create_task(auth_client)
    assert task["title"] == "My Task"
    assert task["status"] == "pending"


async def test_list_tasks(auth_client: AsyncClient) -> None:
    await _create_task(auth_client, "Task 1")
    await _create_task(auth_client, "Task 2")
    resp = await auth_client.get("/api/tasks")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_get_task(auth_client: AsyncClient) -> None:
    task = await _create_task(auth_client)
    resp = await auth_client.get(f"/api/tasks/{task['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == task["id"]


async def test_update_task(auth_client: AsyncClient) -> None:
    task = await _create_task(auth_client)
    resp = await auth_client.patch(f"/api/tasks/{task['id']}", json={"title": "Updated"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated"


async def test_delete_task(auth_client: AsyncClient) -> None:
    task = await _create_task(auth_client)
    resp = await auth_client.delete(f"/api/tasks/{task['id']}")
    assert resp.status_code == 204

    resp = await auth_client.get(f"/api/tasks/{task['id']}")
    assert resp.status_code == 404


async def test_status_transition_valid(auth_client: AsyncClient) -> None:
    task = await _create_task(auth_client)
    resp = await auth_client.patch(f"/api/tasks/{task['id']}/status", json={"status": "in_progress"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"


async def test_status_transition_invalid(auth_client: AsyncClient) -> None:
    task = await _create_task(auth_client)
    # pending → done is not allowed directly
    resp = await auth_client.patch(f"/api/tasks/{task['id']}/status", json={"status": "done"})
    assert resp.status_code == 400
    assert "Cannot transition" in resp.json()["detail"]


async def test_done_task_cannot_change_status(auth_client: AsyncClient) -> None:
    task = await _create_task(auth_client)
    await auth_client.patch(f"/api/tasks/{task['id']}/status", json={"status": "in_progress"})
    await auth_client.patch(f"/api/tasks/{task['id']}/status", json={"status": "done"})

    resp = await auth_client.patch(f"/api/tasks/{task['id']}/status", json={"status": "pending"})
    assert resp.status_code == 400


async def test_other_user_cannot_access_task(client: AsyncClient) -> None:
    # Register user A and create a task
    await client.post("/api/auth/register", json={
        "email": "usera@example.com", "password": "password123", "name": "User A"
    })
    login_a = await client.post("/api/auth/login", json={
        "email": "usera@example.com", "password": "password123"
    })
    token_a = login_a.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token_a}"

    resp = await client.post("/api/tasks", json={"title": "Private Task"})
    task_id = resp.json()["id"]

    # Register user B
    await client.post("/api/auth/register", json={
        "email": "userb@example.com", "password": "password123", "name": "User B"
    })
    login_b = await client.post("/api/auth/login", json={
        "email": "userb@example.com", "password": "password123"
    })
    token_b = login_b.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token_b}"

    resp = await client.get(f"/api/tasks/{task_id}")
    assert resp.status_code == 403


async def test_unauthenticated_access_returns_401(client: AsyncClient) -> None:
    resp = await client.get("/api/tasks")
    assert resp.status_code == 403  # HTTPBearer returns 403 when no token
