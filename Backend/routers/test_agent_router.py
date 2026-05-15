from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import random
import json
import numpy as np
from datetime import date
import os
from supabase import create_client, Client

from schemas import ExamRequest, Thresholds, ExamType
from services.orchestrator import ExamOrchestrator

router = APIRouter(prefix="/test-agent", tags=["Test Agent"])

SUPABASE_URL = 'https://rfdpwfcydiimnsrcrpnj.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHB3ZmN5ZGlpbW5zcmNycG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjUwNzcsImV4cCI6MjA4Njc0MTA3N30.4R05d1KJu59eLscmrNmJK878mYsVYJPhUiuyLoCssaY'
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def numpy_encoder(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    raise TypeError

class TestExamRequest(BaseModel):
    employee_id: str
    company_id: str
    exam_type: str
    is_altered: bool

def make_thresholds(values):
    return Thresholds(
        freq_250=values[0],
        freq_500=values[1],
        freq_1000=values[2],
        freq_2000=values[3],
        freq_3000=values[4],
        freq_4000=values[5],
        freq_6000=values[6],
        freq_8000=values[7],
    )

@router.post("/generate")
def generate_and_process_exam(request: TestExamRequest):
    """
    Gera dados de audiometria, passa pelo motor de IA (G2a Brain) e salva no Supabase.
    """
    if request.is_altered:
        od_values = [30, 40, 45, 50, 60, 65, 70, 75]
        oe_values = [25, 35, 40, 45, 55, 60, 65, 70]
    else:
        od_values = [10, 15, 10, 15, 20, 15, 10, 15]
        oe_values = [15, 10, 15, 10, 10, 15, 15, 10]

    # Monta o objeto de exame para o motor
    try:
        exam_enum = ExamType(request.exam_type)
    except ValueError:
        exam_enum = ExamType.PERIODICO

    exam_request = ExamRequest(
        employee_id=request.employee_id,
        company_id=request.company_id,
        exam_date=date.today(),
        exam_type=exam_enum,
        rest_hours=14,
        thresholds_od_air=make_thresholds(od_values),
        thresholds_oe_air=make_thresholds(oe_values)
    )

    # 1. Buscar exame de referência
    ref_data = None
    ref_query = supabase.table("audiometric_exams")\
        .select("id, thresholds_od_air, thresholds_oe_air")\
        .eq("employee_id", request.employee_id)\
        .eq("is_reference", True)\
        .execute()
    
    if ref_query.data:
        ref_data = ref_query.data[0]

    # 2. Passar pelo Cérebro G2A (Motor Clínico + IA)
    print("🧠 Agente: Enviando para o Motor G2a...")
    orchestrated_result = ExamOrchestrator.process(exam_request, ref_data)

    diagnosis_json = orchestrated_result["diagnosis_text"]
    diagnosis_string = json.dumps(diagnosis_json, ensure_ascii=False, default=numpy_encoder)

    # 3. Salvar no Banco (Supabase)
    print("💾 Agente: Salvando no Supabase...")
    db_payload = {
        "employee_id": request.employee_id,
        "company_id": request.company_id,
        "exam_date": str(date.today()),
        "exam_type": request.exam_type,
        "is_reference": orchestrated_result["is_reference"],
        "rest_hours_ok": True,
        "meatoscopy_ok": True,
        "thresholds_od_air": exam_request.thresholds_od_air.model_dump(by_alias=True),
        "thresholds_oe_air": exam_request.thresholds_oe_air.model_dump(by_alias=True),
        "result_status": orchestrated_result["final_status"],
        "diagnosis_text": diagnosis_string
    }

    insert_res = supabase.table("audiometric_exams").insert(db_payload).execute()

    if not insert_res.data:
        raise HTTPException(status_code=500, detail="Erro ao salvar no Supabase.")

    return {
        "status": "sucesso",
        "message": "Exame gerado, processado pela IA e salvo com sucesso!",
        "exam_id": insert_res.data[0]["id"],
        "is_altered": request.is_altered,
        "ai_result": diagnosis_json
    }
