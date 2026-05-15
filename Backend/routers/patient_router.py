import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from supabase import Client
from google import genai
from google.genai import types

router = APIRouter()

@router.get("/api/v1/patients/{employee_id}/analysis")
async def generate_patient_analysis(
    employee_id: str,
    company_id: str
):
    from main import supabase
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not connected")

    # Fetch employee data
    emp_res = supabase.table("employees") \
        .select("*, sectors(name), job_roles(name), ghe(name)") \
        .eq("id", employee_id) \
        .eq("company_id", company_id) \
        .single() \
        .execute()
        
    emp_data = emp_res.data
    if not emp_data:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado.")

    # Fetch exams
    exams_res = supabase.table("audiometric_exams") \
        .select("*") \
        .eq("employee_id", employee_id) \
        .order("exam_date", desc=False) \
        .execute()
        
    exams_data = exams_res.data or []

    if not exams_data:
        return {"analysis": "Este funcionário ainda não possui exames de audiometria registrados para análise."}

    # Extract relevant info
    role_name = emp_data.get('job_roles', {}).get('name') if isinstance(emp_data.get('job_roles'), dict) else 'Não definido'
    sector_name = emp_data.get('sectors', {}).get('name') if isinstance(emp_data.get('sectors'), dict) else 'Não definido'

    # Build exam history string
    exam_history = ""
    for ex in exams_data:
        status = ex.get('result_status', 'normal').upper()
        date = ex.get('exam_date')
        tipo = ex.get('exam_type', 'periodico').upper()
        
        exam_history += f"- Data: {date} | Tipo: {tipo} | Status NR-7: {status}\n"
        
        diag_text = ex.get('diagnosis_text')
        if diag_text:
            exam_history += f"  (Detalhes clínicos do exame disponíveis)\n"

    context = f"""
    DADOS DO TRABALHADOR:
    Nome: {emp_data.get('full_name')}
    Idade/Nascimento: {emp_data.get('birth_date')}
    Setor: {sector_name}
    Cargo: {role_name}
    
    HISTÓRICO DE EXAMES AUDIOMÉTRICOS:
    {exam_history}
    """

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        api_key = ""
        
    client = genai.Client(api_key=api_key)
    
    system_instruction = """
    Você é a G2A Brain, Especialista em Fonoaudiologia e Medicina do Trabalho.
    Sua tarefa é analisar o histórico audiométrico INDIVIDUAL de um trabalhador.
    
    Diretrizes:
    1. Resumo do Trabalhador: Faça uma introdução sobre o risco do cargo e setor.
    2. Evolução Clínica: Analise a linha do tempo dos exames (piorou, estabilizou, melhorou?).
    3. Parecer e Recomendações: Diga se ele precisa de atenção médica imediata, troca de EPI, mudança de setor ou apenas acompanhamento normal.
    
    Formate a resposta em Markdown (limpo e direto). Seja clínico, empático e focado na prevenção ocupacional (PAINPSE). Não invente dados.
    """

    try:
        response = client.models.generate_content(
            model='gemma-4-31b-it',
            contents=context,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
            )
        )
        return {"analysis": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na IA: {str(e)}")
