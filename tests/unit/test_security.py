"""Unit tests for app.core.security — no DB, no HTTP."""
from datetime import timedelta

import pytest
from jose import jwt

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    _create_token,
)
from app.core.config import settings


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def test_hash_is_not_plaintext():
    assert hash_password("secret") != "secret"


def test_verify_correct_password():
    hashed = hash_password("mypassword")
    assert verify_password("mypassword", hashed) is True


def test_verify_wrong_password():
    hashed = hash_password("mypassword")
    assert verify_password("wrong", hashed) is False


def test_two_hashes_of_same_password_differ():
    # bcrypt uses a random salt — same input → different output each time
    h1 = hash_password("abc")
    h2 = hash_password("abc")
    assert h1 != h2


# ---------------------------------------------------------------------------
# Token creation
# ---------------------------------------------------------------------------

def test_create_access_token_returns_string():
    token = create_access_token("user-123")
    assert isinstance(token, str)
    assert len(token) > 0


def test_create_refresh_token_returns_string():
    token = create_refresh_token("user-123")
    assert isinstance(token, str)
    assert len(token) > 0


def test_access_token_contains_correct_type():
    token = create_access_token("user-123")
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["type"] == "access"
    assert payload["sub"] == "user-123"


def test_refresh_token_contains_correct_type():
    token = create_refresh_token("user-123")
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["type"] == "refresh"
    assert payload["sub"] == "user-123"


# ---------------------------------------------------------------------------
# Token decoding
# ---------------------------------------------------------------------------

def test_decode_access_token_returns_user_id():
    token = create_access_token("user-abc")
    assert decode_token(token, expected_type="access") == "user-abc"


def test_decode_refresh_token_returns_user_id():
    token = create_refresh_token("user-xyz")
    assert decode_token(token, expected_type="refresh") == "user-xyz"


def test_decode_access_token_with_refresh_type_returns_none():
    token = create_access_token("user-123")
    assert decode_token(token, expected_type="refresh") is None


def test_decode_refresh_token_with_access_type_returns_none():
    token = create_refresh_token("user-123")
    assert decode_token(token, expected_type="access") is None


def test_decode_invalid_token_returns_none():
    assert decode_token("not.a.jwt", expected_type="access") is None


def test_decode_garbage_returns_none():
    assert decode_token("garbage", expected_type="access") is None


def test_decode_expired_token_returns_none():
    expired = _create_token("user-123", timedelta(seconds=-1), "access")
    assert decode_token(expired, expected_type="access") is None
