from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import case_router, cctv_router, copilot_router, pmi_router, security_router
import logging

load_dotenv(Path(__file__).resolve().parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("aegis")

app = FastAPI(
    title="AEGIS Command Backend API",
    description="Forensic intelligence system — Case management, PMI prediction, and CCTV analysis",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(case_router.router, prefix="/api")
app.include_router(pmi_router.router, prefix="/api/pmi", tags=["PMI Prediction"])
app.include_router(cctv_router.router, prefix="/api/cctv", tags=["CCTV Analysis"])
app.include_router(copilot_router.router, prefix="/api")
app.include_router(security_router.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    logger.info("AEGIS Command Backend starting up...")
    logger.info("  → Case management module: ACTIVE")
    logger.info("  → PMI prediction module: ACTIVE")
    logger.info("  → CCTV forensic analysis module: ACTIVE")

    try:
        from services.copilot_service import ensure_corpus

        ensure_corpus()
        logger.info("  → Copilot evidence RAG: ACTIVE")
    except Exception as exc:
        logger.warning("  → Copilot corpus init skipped: %s", exc)

    from security import is_key_configured

    if is_key_configured():
        try:
            from security import ensure_autopsies_file
            from services.autopsy_service import autopsy_service

            if ensure_autopsies_file():
                autopsy_service.reload()
                logger.info("  → AES-256-GCM autopsies: %s records", len(autopsy_service.df))
        except Exception as exc:
            logger.warning("  → AES-256 autopsy seed skipped: %s", exc)
    else:
        logger.warning("  → AES-256: set AEGIS_AES256_KEY in backend/.env")

    try:
        from routers.pmi_router import load_model

        load_model()
    except Exception as e:
        logger.warning(f"PMI model auto-load skipped: {e}")


@app.get("/")
def read_root():
    return {"message": "AEGIS Command Backend is running. Access /docs for Swagger UI."}
