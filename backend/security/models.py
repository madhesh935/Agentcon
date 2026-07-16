from typing import Literal, Optional

from pydantic import BaseModel

from security.crypto import AES256_ALGORITHM


class SecurityField(BaseModel):
    algorithm: Literal["AES-256-GCM"] = AES256_ALGORITHM
    ciphertext: Optional[str] = None
