import logging
import os

import pandas as pd

from security import ensure_autopsies_file, is_key_configured, load_autopsies

logger = logging.getLogger("aegis.autopsy")

CSV_PATH = os.path.join(os.path.dirname(__file__), "../../dataset/forensic_autopsy_3000.csv")


class AutopsyService:
    def __init__(self):
        self.df = pd.DataFrame()
        self.reload()

    def reload(self) -> None:
        if is_key_configured() and ensure_autopsies_file():
            try:
                self.df = pd.DataFrame(load_autopsies()).fillna("")
                logger.info("Loaded %s autopsy records (AES-256-GCM)", len(self.df))
                return
            except Exception as exc:
                logger.warning("Encrypted load failed (%s), using CSV", exc)
        try:
            self.df = pd.read_csv(CSV_PATH).fillna("")
            logger.info("Loaded %s autopsy records (CSV)", len(self.df))
        except Exception as exc:
            logger.error("CSV load failed: %s", exc)
            self.df = pd.DataFrame()

    def get_all_autopsies(self, limit: int = 50, skip: int = 0):
        if self.df.empty:
            return []
        return self.df.iloc[skip : skip + limit].to_dict(orient="records")

    def get_autopsy_by_cpr(self, cpr_number: str):
        if self.df.empty:
            return None
        match = self.df[self.df["CPR Number"] == cpr_number]
        return match.iloc[0].to_dict() if not match.empty else None


autopsy_service = AutopsyService()
