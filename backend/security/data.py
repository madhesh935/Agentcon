import logging
from pathlib import Path
from typing import Any

import pandas as pd

from security.crypto import decrypt_json, encrypt_json, is_key_configured, require_key

logger = logging.getLogger("aegis.security")

BACKEND_ROOT = Path(__file__).resolve().parent.parent
ENCRYPTED_DIR = BACKEND_ROOT / "data" / "encrypted"
AUTOPSIES_FILE = ENCRYPTED_DIR / "autopsies.enc"
DATASET_CSV = BACKEND_ROOT.parent / "dataset" / "forensic_autopsy_3000.csv"


def encrypt_csv_to_file(csv_path: Path | None = None, out_path: Path | None = None) -> Path:
    require_key()
    target = out_path or AUTOPSIES_FILE
    source = csv_path or DATASET_CSV
    ENCRYPTED_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(source).fillna("")
    records = df.to_dict(orient="records")
    payload = {"dataset": source.name, "count": len(records), "records": records}
    target.write_text(encrypt_json(payload), encoding="utf-8")
    logger.info("AES-256-GCM wrote %s records → %s", len(records), target)
    return target


def load_autopsies() -> list[dict[str, Any]]:
    require_key()
    data = decrypt_json(AUTOPSIES_FILE.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "records" in data:
        return data["records"]
    if isinstance(data, list):
        return data
    raise ValueError("Invalid encrypted autopsy file.")


def ensure_autopsies_file() -> bool:
    if not is_key_configured():
        return False
    if not AUTOPSIES_FILE.exists():
        encrypt_csv_to_file()
    return AUTOPSIES_FILE.is_file()
