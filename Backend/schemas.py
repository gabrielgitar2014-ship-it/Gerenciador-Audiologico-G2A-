from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional
from datetime import date
from enum import Enum

class ExamType(str, Enum):
    ADMISSIONAL = "admissional"
    PERIODICO = "periodico"
    DEMISSIONAL = "demissional"
    MUDANCA_RISCO = "mudanca_risco"
    RETORNO_TRABALHO = "retorno_trabalho"

class Thresholds(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    freq_250: Optional[float] = Field(None, alias="250")
    freq_500: Optional[float] = Field(None, alias="500")
    freq_750: Optional[float] = Field(None, alias="750") 
    freq_1000: Optional[float] = Field(None, alias="1000")
    freq_1500: Optional[float] = Field(None, alias="1500")
    freq_2000: Optional[float] = Field(None, alias="2000")
    freq_3000: Optional[float] = Field(None, alias="3000")
    freq_4000: Optional[float] = Field(None, alias="4000")
    freq_6000: Optional[float] = Field(None, alias="6000")
    freq_8000: Optional[float] = Field(None, alias="8000")

class ExamRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    exam_id: Optional[str] = None 

    employee_id: str
    company_id: str
    professional_id: Optional[str] = None
    exam_date: date
    exam_type: ExamType
    rest_hours: int
    thresholds_od_air: Thresholds
    thresholds_oe_air: Thresholds
    thresholds_od_bone: Optional[Thresholds] = None
    thresholds_oe_bone: Optional[Thresholds] = None

    @validator('rest_hours')
    def validate_rest(cls, v):
        if v < 14:
            raise ValueError("O repouso auditivo deve ser de no mínimo 14 horas.")
        return v