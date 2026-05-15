import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from supabase import Client
from google import genai
from google.genai import types

router = APIRouter()

@router.get("/api/v1/reports/epidemiological")
async def generate_epidemiological_report(
    company_id: str,
    year: str,
    professional_id: Optional[str] = None
):
    from main import supabase
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not connected")

    # Primeiro verifica se já existe um relatório salvo para este ano/empresa
    if year != "todos":
        saved_report_res = supabase.table("epidemiological_reports") \
            .select("*") \
            .eq("company_id", company_id) \
            .eq("year", year) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
            
        if saved_report_res.data:
            return {"report": saved_report_res.data[0]['report_text'], "cached": True}

    # 1. Fetch data from Supabase
    query = supabase.table("audiometric_exams") \
        .select("id, exam_date, result_status, thresholds_od_air, thresholds_oe_air, employee_id") \
        .eq("company_id", company_id)

    if year != "todos":
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"
        query = query.gte("exam_date", start_date).lte("exam_date", end_date)

    exams_res = query.execute()
        
    exams_data = exams_res.data or []

    if not exams_data:
        period_str = f"no ano {year}" if year != "todos" else "no histórico"
        return {"report": f"Não há dados suficientes {period_str} para gerar um relatório epidemiológico consistente."}

    # Pegar info dos employees para mapear setor e cargo
    emp_ids = list(set([ex['employee_id'] for ex in exams_data]))
    
    # Para evitar erros de payload gigante, dividimos as requisições se for mto grande
    # assumindo que cabe em um request
    emps_res = supabase.table("employees") \
        .select("id, full_name, sectors(name), job_roles(name)") \
        .eq("company_id", company_id) \
        .in_("id", emp_ids) \
        .execute()
        
    emps_dict = {emp['id']: emp for emp in (emps_res.data or [])}
    
    # 2. Aggregating the data for the prompt
    total_exams = len(exams_data)
    status_counts = {"normal": 0, "alterado_preexistente": 0, "sugestivo_painpse": 0, "alterado_estavel": 0, "outros": 0}
    
    yearly_stats = {}
    
    risky_roles = {}
    risky_sectors = {}
    employees_attention = []

    for ex in exams_data:
        status = (ex.get('result_status') or 'normal').lower()
        exam_year = str(ex.get('exam_date', ''))[:4]
        
        if exam_year and exam_year not in yearly_stats:
            yearly_stats[exam_year] = {"total": 0, "normal": 0, "alterado": 0, "sugestivo_painpse": 0}
            
        if exam_year:
            yearly_stats[exam_year]["total"] += 1
        
        if status in status_counts:
            status_counts[status] += 1
        elif 'painpse' in status:
            status_counts['sugestivo_painpse'] += 1
        elif 'alterado' in status:
            status_counts['alterado_estavel'] += 1
        else:
            status_counts['outros'] += 1
            
        if exam_year:
            if 'painpse' in status:
                yearly_stats[exam_year]['sugestivo_painpse'] += 1
            elif 'alterado' in status:
                yearly_stats[exam_year]['alterado'] += 1
            elif status == 'normal':
                yearly_stats[exam_year]['normal'] += 1
            
        emp = emps_dict.get(ex['employee_id'])
        if emp and ('alterado' in status or 'painpse' in status):
            role = emp.get('job_roles')
            role_name = role['name'] if isinstance(role, dict) and role.get('name') else 'Sem Função'
            
            sector = emp.get('sectors')
            sector_name = sector['name'] if isinstance(sector, dict) and sector.get('name') else 'Sem Setor'
            
            risky_roles[role_name] = risky_roles.get(role_name, 0) + 1
            risky_sectors[sector_name] = risky_sectors.get(sector_name, 0) + 1
            
            employees_attention.append({
                "nome": emp.get('full_name'),
                "cargo": role_name,
                "setor": sector_name,
                "status": status
            })

    # Sort risky stuff
    sorted_roles = sorted(risky_roles.items(), key=lambda x: x[1], reverse=True)[:5]
    sorted_sectors = sorted(risky_sectors.items(), key=lambda x: x[1], reverse=True)[:5]
    
    period_title = f"ANO {year}" if year != "todos" else "HISTÓRICO COMPLETO (TODOS OS ANOS)"
    
    yearly_context = ""
    if year == "todos" and yearly_stats:
        yearly_context = "\nEvolução por Ano:\n"
        for y in sorted(yearly_stats.keys()):
            st = yearly_stats[y]
            yearly_context += f"- Ano {y}: Total={st['total']} | Normais={st['normal']} | Sugestivos PAINPSE={st['sugestivo_painpse']} | Alterados={st['alterado']}\n"

    # Contexto para a IA
    context = f"""
    DADOS EPIDEMIOLÓGICOS - {period_title}
    Total de Exames Realizados: {total_exams}
    
    Distribuição de Resultados (NR-7):
    - Normais: {status_counts['normal']}
    - Sugestivos de PAINPSE (Piora Ocupacional): {status_counts['sugestivo_painpse']}
    - Alterados (Preexistentes ou Estáveis): {status_counts['alterado_preexistente'] + status_counts['alterado_estavel']}
    {yearly_context}
    Funções com Maior Índice de Alteração:
    {sorted_roles}
    
    Setores com Maior Índice de Alteração:
    {sorted_sectors}
    
    Trabalhadores com Alterações (Prioridade de Acompanhamento):
    {str(employees_attention[:15])} # Listando até 15 para não estourar contexto
    """

    # 3. Call AI
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        api_key = ""
        
    client = genai.Client(api_key=api_key)
    
    system_instruction = """
    Você é a G2A Brain, Especialista em Medicina e Fonoaudiologia do Trabalho.
    Sua tarefa é elaborar o 'Relatório Epidemiológico Anual do PCA (Programa de Conservação Auditiva)' baseado nos dados fornecidos do banco de dados (Supabase).
    
    CRÍTICO:
    - O relatório será emitido e assinado por um fonoaudiólogo/médico real da empresa. Não coloque seu nome, não se identifique como "G2A Brain" e não diga "Sou uma IA" no final.
    - Escreva na 3ª pessoa de forma impessoal e técnica (Ex: "A análise dos dados evidencia...", "Conclui-se que...").
    
    Diretrizes do Relatório:
    1. Resumo Executivo: Visão geral da saúde auditiva do período.
    2. Comparativo Histórico: (MUITO IMPORTANTE) Se houver dados de múltiplos anos no contexto (Evolução por Ano), faça um comparativo detalhado da linha do tempo. Informe a evolução dos casos (se aumentaram ou diminuíram ao longo dos anos) indicando as discrepâncias entre os anos passados e os mais recentes.
    3. Análise Crítica: Destacar onde estão os maiores riscos (setores e cargos).
    4. Trabalhadores em Foco: Mencione quem são as pessoas que precisam de atenção médica e fonoaudiológica imediata baseando-se nos dados.
    5. Plano de Ação e Sugestões: O que a clínica/empresa deve fazer no próximo ano para frear o adoecimento (EPIs, Treinamentos, Protetores Moldados, Repouso Acústico, etc).
    
    Escreva um documento com linguagem clínica e de gestão (nível diretoria), utilizando formatação em Markdown bem elaborada (listas, bold, títulos h2/h3). Não invente dados que não estão no contexto.
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
        
        report_text = response.text
        
        # Salvar no banco de dados se não for "todos"
        if year != "todos" and professional_id:
            try:
                supabase.table("epidemiological_reports").insert({
                    "company_id": company_id,
                    "year": year,
                    "report_text": report_text,
                    "generated_by": professional_id
                }).execute()
            except Exception as db_err:
                print(f"Erro ao salvar relatório no banco: {db_err}")
                
        return {"report": report_text, "cached": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na IA: {str(e)}")
