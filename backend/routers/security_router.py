"""FastAPI routes for AES-256-GCM security."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from security import (
    AES256_ALGORITHM,
    AUTOPSIES_FILE,
    decrypt_json,
    encrypt_csv_to_file,
    encrypt_json,
    ensure_autopsies_file,
    is_key_configured,
    load_autopsies,
    require_key,
)
from security.crypto import ENV_KEY
from security.models import SecurityField

router = APIRouter(tags=["Security"])


def _require_aes_key() -> None:
    try:
        require_key()
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


# ─── Request / response models ───────────────────────────────────────────────


class SecurityStatusResponse(BaseModel):
    algorithm: str
    key_configured: bool
    env_key: str
    encrypted_autopsies: bool
    autopsy_records_loaded: int


class SecurityAtRestResponse(BaseModel):
    algorithm: str
    path: str
    file_exists: bool
    file_bytes: int
    records_in_store: int | None = None


class EncryptRequest(BaseModel):
    payload: dict[str, Any] = Field(..., description="JSON object to encrypt with AES-256-GCM")


class EncryptResponse(BaseModel):
    algorithm: str
    security: SecurityField


class DecryptRequest(BaseModel):
    security: SecurityField = Field(..., description="Must include ciphertext")


class DecryptResponse(BaseModel):
    algorithm: str
    payload: dict[str, Any] | list[Any] | str | int | float | bool | None


class ReseedResponse(BaseModel):
    algorithm: str
    path: str
    records: int
    message: str


class EnsureStoreResponse(BaseModel):
    algorithm: str
    created: bool
    path: str
    records: int


class SecurityRoutesResponse(BaseModel):
    algorithm: str
    routes: list[dict[str, str]]


# ─── Routes ──────────────────────────────────────────────────────────────────


@router.get("/security/status", response_model=SecurityStatusResponse)
def security_status():
    """Whether AES-256 key is loaded and encrypted autopsy store exists."""
    from services.autopsy_service import autopsy_service

    return SecurityStatusResponse(
        algorithm=AES256_ALGORITHM,
        key_configured=is_key_configured(),
        env_key=ENV_KEY,
        encrypted_autopsies=AUTOPSIES_FILE.is_file(),
        autopsy_records_loaded=len(autopsy_service.df),
    )


@router.get("/security/at-rest", response_model=SecurityAtRestResponse)
def security_at_rest():
    """Metadata for the encrypted autopsy file on disk."""
    _require_aes_key()
    records = None
    if AUTOPSIES_FILE.is_file():
        try:
            records = len(load_autopsies())
        except Exception:
            records = None
    size = AUTOPSIES_FILE.stat().st_size if AUTOPSIES_FILE.is_file() else 0
    return SecurityAtRestResponse(
        algorithm=AES256_ALGORITHM,
        path=str(AUTOPSIES_FILE),
        file_exists=AUTOPSIES_FILE.is_file(),
        file_bytes=size,
        records_in_store=records,
    )


@router.get("/security/routes", response_model=SecurityRoutesResponse)
def security_routes():
    """Catalog of all security-related API endpoints."""
    return SecurityRoutesResponse(
        algorithm=AES256_ALGORITHM,
        routes=[
            {"method": "GET", "path": "/api/security/status", "description": "Key and store status"},
            {"method": "GET", "path": "/api/security/at-rest", "description": "Encrypted file metadata"},
            {"method": "GET", "path": "/api/security/routes", "description": "This route list"},
            {"method": "POST", "path": "/api/security/encrypt", "description": "Encrypt JSON → security.ciphertext"},
            {"method": "POST", "path": "/api/security/decrypt", "description": "Decrypt security.ciphertext → JSON"},
            {"method": "POST", "path": "/api/security/ensure", "description": "Create autopsies.enc if missing"},
            {"method": "POST", "path": "/api/security/reseed", "description": "Re-encrypt CSV → autopsies.enc"},
            {
                "method": "POST",
                "path": "/api/pmi/predict/secure",
                "description": "PMI predict with AES-256-GCM request/response",
            },
        ],
    )


@router.post("/security/encrypt", response_model=EncryptResponse)
def security_encrypt(body: EncryptRequest):
    """Encrypt a JSON payload; use ciphertext in POST /api/pmi/predict/secure."""
    _require_aes_key()
    try:
        ciphertext = encrypt_json(body.payload)
        return EncryptResponse(
            algorithm=AES256_ALGORITHM,
            security=SecurityField(ciphertext=ciphertext),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/security/decrypt", response_model=DecryptResponse)
def security_decrypt(body: DecryptRequest):
    """Decrypt security.ciphertext (verify or inspect encrypted payloads)."""
    _require_aes_key()
    if not body.security.ciphertext:
        raise HTTPException(status_code=400, detail="security.ciphertext is required.")
    if body.security.algorithm != AES256_ALGORITHM:
        raise HTTPException(status_code=400, detail=f"Only {AES256_ALGORITHM} is supported.")
    try:
        payload = decrypt_json(body.security.ciphertext)
        return DecryptResponse(algorithm=AES256_ALGORITHM, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/security/ensure", response_model=EnsureStoreResponse)
def security_ensure():
    """Create encrypted autopsies.enc from CSV when key is set and file is missing."""
    _require_aes_key()
    existed = AUTOPSIES_FILE.is_file()
    ensure_autopsies_file()
    from services.autopsy_service import autopsy_service

    autopsy_service.reload()
    return EnsureStoreResponse(
        algorithm=AES256_ALGORITHM,
        created=not existed,
        path=str(AUTOPSIES_FILE),
        records=len(autopsy_service.df),
    )


@router.post("/security/reseed", response_model=ReseedResponse)
def security_reseed():
    """Re-encrypt the forensic autopsy CSV into autopsies.enc."""
    _require_aes_key()
    try:
        path = encrypt_csv_to_file()
        from services.autopsy_service import autopsy_service

        autopsy_service.reload()
        return ReseedResponse(
            algorithm=AES256_ALGORITHM,
            path=str(path),
            records=len(autopsy_service.df),
            message="Autopsy dataset re-encrypted with AES-256-GCM.",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
