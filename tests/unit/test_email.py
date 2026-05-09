"""Unit tests for app.services.email — resend is fully mocked."""
import asyncio
from unittest.mock import patch, MagicMock

import pytest

from app.services.email import send_share_email


@pytest.mark.asyncio
async def test_send_share_email_calls_resend_send():
    mock_send = MagicMock(return_value={"id": "fake-id"})
    with patch("app.services.email.resend.Emails.send", mock_send):
        await send_share_email(
            recipient="user@example.com",
            task_title="Buy milk",
            token="tok-abc",
            owner_name="Alice",
        )
    mock_send.assert_called_once()


@pytest.mark.asyncio
async def test_send_share_email_recipient_in_params():
    mock_send = MagicMock(return_value={"id": "fake-id"})
    with patch("app.services.email.resend.Emails.send", mock_send):
        await send_share_email(
            recipient="bob@example.com",
            task_title="Buy milk",
            token="tok-abc",
            owner_name="Alice",
        )
    call_params = mock_send.call_args[0][0]
    assert "bob@example.com" in call_params["to"]


@pytest.mark.asyncio
async def test_send_share_email_subject_contains_owner_name():
    mock_send = MagicMock(return_value={"id": "fake-id"})
    with patch("app.services.email.resend.Emails.send", mock_send):
        await send_share_email(
            recipient="bob@example.com",
            task_title="Buy milk",
            token="tok-abc",
            owner_name="Alice",
        )
    call_params = mock_send.call_args[0][0]
    assert "Alice" in call_params["subject"]


@pytest.mark.asyncio
async def test_send_share_email_body_contains_token_link():
    mock_send = MagicMock(return_value={"id": "fake-id"})
    with patch("app.services.email.resend.Emails.send", mock_send):
        await send_share_email(
            recipient="bob@example.com",
            task_title="Buy milk",
            token="tok-xyz",
            owner_name="Alice",
        )
    call_params = mock_send.call_args[0][0]
    assert "tok-xyz" in call_params["html"]


@pytest.mark.asyncio
async def test_send_share_email_body_contains_task_title():
    mock_send = MagicMock(return_value={"id": "fake-id"})
    with patch("app.services.email.resend.Emails.send", mock_send):
        await send_share_email(
            recipient="bob@example.com",
            task_title="Buy milk",
            token="tok-xyz",
            owner_name="Alice",
        )
    call_params = mock_send.call_args[0][0]
    assert "Buy milk" in call_params["html"]
