"""
JWT authentication for the Agentic Trainer API.

Seeded demo users (replace with SSO / IdP in real production):
  user@company.com  / User123!   → role=user
  admin@company.com / Admin123!  → role=admin
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

Role = Literal["user", "admin"]

JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
JWT_ALG = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "12"))

_security = HTTPBearer(auto_error=False)


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000
    ).hex()


def _make_user(email: str, name: str, role: Role, password: str) -> dict:
    salt = secrets.token_hex(16)
    return {
        "email": email.lower(),
        "name": name,
        "role": role,
        "salt": salt,
        "password_hash": _hash_password(password, salt),
    }


# In-memory user store for the production bootstrap. Swap for DB/OIDC later.
USERS: dict[str, dict] = {
    u["email"]: u
    for u in (
        _make_user("user@company.com", "Amrit K.", "user", "User123!"),
        _make_user("admin@company.com", "Arun Verma", "admin", "Admin123!"),
    )
}


class TokenUser(BaseModel):
    email: str
    name: str
    role: Role


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)
    # Optional display name override for first-time UX; ignored if user exists.
    name: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: TokenUser


def verify_password(user: dict, password: str) -> bool:
    digest = _hash_password(password, user["salt"])
    return hmac.compare_digest(digest, user["password_hash"])


def create_access_token(user: dict) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user["email"],
        "name": user["name"],
        "role": user["role"],
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> TokenUser:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc
    return TokenUser(
        email=payload["sub"],
        name=payload.get("name", payload["sub"]),
        role=payload.get("role", "user"),
    )


def authenticate(email: str, password: str) -> dict:
    user = USERS.get(email.lower().strip())
    if not user or not verify_password(user, password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return user


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_security)],
) -> TokenUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return decode_token(credentials.credentials)


async def require_admin(user: Annotated[TokenUser, Depends(get_current_user)]) -> TokenUser:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
