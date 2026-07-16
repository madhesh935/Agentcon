from __future__ import annotations

from enum import Enum
from typing import Any, Dict

from pydantic import BaseModel, Field, model_validator

from security import AES256_ALGORITHM, SecurityField

__all__ = ["SecurityField", "PMIRequest", "PMIResponse", "SecurePMIRequest", "SecurePMIResponse"]


class SexEnum(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"


class PutreLevelEnum(str, Enum):
    NONE = "None"
    MILD = "Mild"
    MODERATE = "Moderate"
    SEVERE = "Severe"
    ADVANCED = "Advanced"


class RigorMortisEnum(str, Enum):
    NONE = "None"
    BEGINNING = "Beginning (jaw/neck)"
    DEVELOPING = "Developing"
    FULL_FIXED = "Full/Fixed"
    RESOLVED = "Resolved"
    RESOLVING = "Resolving"


class LivorMortisEnum(str, Enum):
    NONE = "None"
    DEVELOPING_FAINT = "Developing (faint)"
    FAINT_POSTERIOR = "Faint posterior"
    FIXED_DEPENDENT = "Fixed (dependent areas)"
    PRONOUNCED = "Pronounced (fixed posterior)"


class StomachContentsEnum(str, Enum):
    EMPTY = "Empty"
    FULLY_DIGESTED = "Fully digested"
    MINIMAL = "Minimal residue"
    PARTIAL = "Partially digested"
    UNDIGESTED = "Undigested food (recent meal)"
    UNKNOWN = "Unknown"


class EntomologyEnum(str, Enum):
    NONE = "None"
    EGGS = "Eggs only"
    LARVAE_1 = "1st instar larvae"
    LARVAE_2 = "2nd instar larvae"
    NO_INSECTS = "No insects present"


class PMIRequest(BaseModel):
    Age: float = Field(..., alias="Age", ge=0, le=120)
    Sex: SexEnum = Field(..., alias="Sex")
    Height: float = Field(..., alias="Height", gt=0, le=300)
    Weight: float = Field(..., alias="Weight", gt=0, le=500)
    Putrefaction: int = Field(..., alias="Putrefaction", ge=0, le=1)
    Putre_level: PutreLevelEnum = Field(..., alias="Putre_level")
    Rigor_Mortis: RigorMortisEnum = Field(..., alias="Rigor Mortis")
    Livor_Mortis: LivorMortisEnum = Field(..., alias="Livor Mortis")
    Algor_Mortis: float = Field(..., alias="Algor Mortis", ge=-10, le=50)
    Stomach_Contents: StomachContentsEnum = Field(..., alias="Stomach Contents")
    Vitreous_Potassium: float = Field(..., alias="Vitreous Potassium", ge=0, le=50)
    Entomology: EntomologyEnum = Field(..., alias="Entomology")

    model_config = {"populate_by_name": True}

    def forensic_features(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True, mode="json")


class SecurePMIRequest(BaseModel):
    security: SecurityField

    @model_validator(mode="after")
    def require_ciphertext(self) -> "SecurePMIRequest":
        if not self.security.ciphertext:
            raise ValueError("security.ciphertext is required.")
        if self.security.algorithm != AES256_ALGORITHM:
            raise ValueError(f"Only {AES256_ALGORITHM} is supported.")
        return self


class PMIResponse(BaseModel):
    predicted_pmi_hours: float
    confidence_score: float
    explanation: Dict[str, Any]
    message: str

    @classmethod
    def from_prediction(
        cls,
        *,
        predicted_pmi_hours: float,
        confidence_score: float,
        explanation: Dict[str, Any],
        message: str,
    ) -> "PMIResponse":
        return cls(
            predicted_pmi_hours=predicted_pmi_hours,
            confidence_score=confidence_score,
            explanation=explanation,
            message=message,
        )


class SecurePMIResponse(BaseModel):
    security: SecurityField
