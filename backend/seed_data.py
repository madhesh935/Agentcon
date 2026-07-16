#!/usr/bin/env python3
"""Build AES-256-GCM encrypted autopsies.enc — requires AEGIS_AES256_KEY in .env."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from security.data import AUTOPSIES_FILE, encrypt_csv_to_file  # noqa: E402


def main() -> int:
    try:
        path = encrypt_csv_to_file()
    except ValueError as exc:
        print(exc, file=sys.stderr)
        print("Set AEGIS_AES256_KEY in backend/.env (64-char hex).", file=sys.stderr)
        return 1
    print(f"AES-256-GCM encrypted autopsies → {path}")
    print(f"Size: {AUTOPSIES_FILE.stat().st_size:,} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
