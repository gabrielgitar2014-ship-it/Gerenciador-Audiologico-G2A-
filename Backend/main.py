import os
import json
import numpy as np
from supabase import create_client, Client
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Importações da nossa arquitetura
from schemas import ExamRequest
from services.orchestrator import ExamOrchestrator

# --- TRADUTOR DE NUMPY PARA JSON ---
def numpy_encoder(obj):
    """Ensina o Python a converter números do Numpy para o formato padrão do banco de dados"""
    if isinstance(obj, np.generic):
        return obj.item()
    raise TypeError

# --- CONFIGURAÇÃO DE NUVEM (Variáveis de Ambiente) ---
# O Google Cloud Run vai injetar essas variáveis automaticamente
SUPABASE_URL = 'https://rfdpwfcydiimnsrcrpnj.supabase.co'
SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHB3ZmN5ZGlpbW5zcmNycG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjUwNzcsImV4cCI6MjA4Njc0MTA3N30.4R05d1KJu59eLscmrNmJK878mYsVYJPhUiuyLoCssaY'
os.environ["GEMINI_API_KEY"] = "AIzaSyDdSHgjW6z2_N5WRbE7FEvL65wVAV2IIt0"

# Validação de Segurança para evitar que o servidor suba cego na nuvem
if not SUPABASE_URL or not SUPABASE_KEY:
    print("\n❌ ERRO FATAL: Variáveis SUPABASE_URL ou SUPABASE_KEY não foram definidas no ambiente.\n")
    # Em produção, o ideal é o servidor nem ligar se não tiver acesso ao banco
    # Mas deixaremos passar para não quebrar o build, falhando apenas na hora da requisição se necessário.

# Inicializa o cliente Supabase (usado apenas para LER o exame de referência)
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Conexão com Supabase estabelecida (Leitura de Referências).")
    except Exception as e:
        print(f"❌ Erro ao conectar no Supabase: {e}")

# --- INICIALIZAÇÃO DA API ---
app = FastAPI(title="G2a Brain API - Cloud Edition")

# CORS liberado para o seu Frontend conseguir conversar com a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Na Vercel, você pode trocar "*" pelo domínio do seu frontend depois por segurança
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    """Rota de verificação para o Google Cloud saber que o servidor está vivo"""
    return {
        "status": "online", 
        "system": "G2a Brain", 
        "architecture": "Stateless AI Cloud", 
        "version": "4.0"
    }

@app.post("/api/v1/exams")
async def process_exam_only(exam: ExamRequest):
    """Rota Stateless: Apenas processa a IA e a matemática, e devolve para o Frontend salvar."""
    try:
        print(f"📥 Processando Avaliação (Cloud). ID: {exam.exam_id if exam.exam_id else 'Novo'}")

        ref_data = None
        
        # 1. Buscar Referência Anterior no Supabase (Apenas se o banco estiver conectado)
        if supabase:
            ref_query = supabase.table("audiometric_exams")\
                .select("thresholds_od_air, thresholds_oe_air")\
                .eq("employee_id", exam.employee_id)\
                .eq("is_reference", True)\
                .execute()
            
            if ref_query.data:
                # Garante que não usaremos o próprio exame como referência em caso de edição
                candidates = [r for r in ref_query.data if str(r.get('id')) != str(exam.exam_id)]
                if candidates: 
                    ref_data = candidates[0]

        # 2. Acionar o Maestro (Orquestrador Clínico, Ocupacional e IA)
        # O Maestro vai puxar a GEMINI_API_KEY direto do os.environ lá dentro do ai_engine.py
        orchestrated_result = ExamOrchestrator.process(exam, ref_data)

        # 3. Empacotar a resposta do JSON Rico
        diagnosis_json_string = json.dumps(
            orchestrated_result["diagnosis_text"], 
            ensure_ascii=False,
            default=numpy_encoder
        )

        # 4. Devolve o pacote pronto para o React (Frontend) salvar
        return {
            "message": "Processamento Concluído",
            "is_reference": orchestrated_result["is_reference"],
            "result_status": orchestrated_result["final_status"],
            "diagnosis_text": diagnosis_json_string
        }

    except Exception as e:
        print(f"❌ Erro Fatal no Motor: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

from routers.import_router import router as import_router
app.include_router(import_router)

from routers.report_router import router as report_router
app.include_router(report_router)

from routers.patient_router import router as patient_router
app.include_router(patient_router)

from routers.test_agent_router import router as test_agent_router
app.include_router(test_agent_router)

if __name__ == "__main__":
    import uvicorn
    # A porta padrão do Google Cloud Run é a 8080 (usada via variável de ambiente PORT)
    # Mas deixamos 8000 como fallback para testes locais
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 G2a Brain Stateless iniciado na porta {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
