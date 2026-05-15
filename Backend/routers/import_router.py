import pandas as pd
import numpy as np
import json
from typing import List
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from supabase import Client

from schemas import ExamRequest, ExamType
from services.orchestrator import ExamOrchestrator

router = APIRouter()

def clean_val(v):
    if pd.isna(v): return None
    return str(v).strip()

def clean_dict(d):
    cleaned = {}
    for k, v in d.items():
        if v is not None and v != 'None' and v != '':
            try:
                cleaned[k] = float(v)
            except:
                pass
    return cleaned if cleaned else None

def numpy_encoder(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    raise TypeError

def process_and_save_exam(supabase: Client, exam_data: dict):
    # Check if already exists
    ex_res = supabase.table('audiometric_exams').select('id').eq('employee_id', exam_data['employee_id']).eq('exam_date', exam_data['exam_date']).execute()
    if ex_res.data:
        return # already exists
        
    # Get reference
    ref_data = None
    ref_query = supabase.table("audiometric_exams")\
        .select("thresholds_od_air, thresholds_oe_air")\
        .eq("employee_id", exam_data['employee_id'])\
        .eq("is_reference", True)\
        .order("exam_date", desc=True)\
        .limit(1)\
        .execute()
    if ref_query.data:
        ref_data = ref_query.data[0]
        
    try:
        # Build ExamRequest
        exam_req = ExamRequest(
            employee_id=exam_data['employee_id'],
            company_id=exam_data['company_id'],
            exam_date=exam_data['exam_date'],
            exam_type=ExamType.ADMISSIONAL if exam_data.get('is_reference') else ExamType.PERIODICO,
            rest_hours=14,
            thresholds_od_air=exam_data.get('thresholds_od_air') or {},
            thresholds_oe_air=exam_data.get('thresholds_oe_air') or {},
            thresholds_od_bone=exam_data.get('thresholds_od_bone'),
            thresholds_oe_bone=exam_data.get('thresholds_oe_bone')
        )
        
        # Process through G2A Brain
        orchestrated_result = ExamOrchestrator.process(exam_req, ref_data)
        
        diagnosis_json_string = json.dumps(
            orchestrated_result["diagnosis_text"], 
            ensure_ascii=False,
            default=numpy_encoder
        )
        
        exam_data['is_reference'] = orchestrated_result["is_reference"]
        exam_data['result_status'] = orchestrated_result["final_status"]
        exam_data['diagnosis_text'] = diagnosis_json_string
    except Exception as e:
        print(f"Brain processing error for {exam_data['exam_date']}: {e}")
        
    # Insert
    supabase.table('audiometric_exams').insert([exam_data]).execute()

@router.post("/api/v1/import-legacy")
async def import_legacy_cases(
    company_id: str = Form(...),
    files: List[UploadFile] = File(...),
):
    from main import supabase
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not connected")

    logs = []
    
    for file in files:
        try:
            content = await file.read()
            df = pd.read_excel(content, header=None)

            row1 = [clean_val(x) for x in df.iloc[1].tolist()]
            row2 = [clean_val(x) for x in df.iloc[2].tolist()]

            matricula = next((x.replace('MATRICULA:', '').strip() for x in row1 if x and 'MATRICULA:' in x), None)
            nome = next((x.replace('NOME:', '').strip() for x in row1 if x and 'NOME:' in x), None)
            funcao = next((x.replace('FUNÇÃO:', '').strip() for x in row2 if x and 'FUNÇÃO:' in x), None)

            if not nome:
                raise Exception("Nome não encontrado na linha 1")

            # 1. Job Role
            job_role_id = None
            if funcao:
                role_res = supabase.table('job_roles').select('id').eq('name', funcao).eq('company_id', company_id).execute()
                if role_res.data:
                    job_role_id = role_res.data[0]['id']
                else:
                    new_role = supabase.table('job_roles').insert([{'name': funcao, 'company_id': company_id}]).execute()
                    if new_role.data:
                        job_role_id = new_role.data[0]['id']

            # 2. Employee
            employee_id = None
            emp_res = supabase.table('employees').select('id').eq('full_name', nome).eq('company_id', company_id).execute()
            if emp_res.data:
                employee_id = emp_res.data[0]['id']
            else:
                new_emp = supabase.table('employees').insert([{
                    'full_name': nome,
                    'matricula': matricula,
                    'job_role_id': job_role_id,
                    'company_id': company_id,
                    'is_active': True
                }]).execute()
                if new_emp.data:
                    employee_id = new_emp.data[0]['id']

            # 3. Exams
            last_exam_data = None

            for i in range(6, len(df)):
                row = [clean_val(x) for x in df.iloc[i].tolist()]
                if not any(row): continue

                is_date_row = row[1] and str(row[1]) != 'None' and len(str(row[1])) >= 10

                if is_date_row:
                    if last_exam_data:
                        process_and_save_exam(supabase, last_exam_data)

                    exam_date_str = str(row[1])[:10]
                    is_ref = 'ref' in str(row[25] or '').lower() or 'ref' in str(row[24] or '').lower()
                    
                    od_air = {
                        "250": row[2], "500": row[3], "1000": row[4],
                        "2000": row[5], "3000": row[6], "4000": row[7],
                        "6000": row[8], "8000": row[9]
                    }
                    oe_air = {
                        "250": row[14], "500": row[15], "1000": row[16],
                        "2000": row[17], "3000": row[18], "4000": row[19],
                        "6000": row[20], "8000": row[21]
                    }

                    last_exam_data = {
                        'employee_id': employee_id,
                        'company_id': company_id,
                        'exam_date': exam_date_str,
                        'is_reference': is_ref,
                        'exam_type': 'admissional' if is_ref else 'periodico',
                        'result_status': str(row[24] or '').lower() if row[24] and str(row[24]).lower() != 'ref' else 'normal',
                        'thresholds_od_air': clean_dict(od_air),
                        'thresholds_oe_air': clean_dict(oe_air),
                        'thresholds_od_bone': None,
                        'thresholds_oe_bone': None
                    }
                elif last_exam_data and row[3] and str(row[3]) != 'None':
                    od_bone = {
                        "500": row[3], "1000": row[4],
                        "2000": row[5], "3000": row[6], "4000": row[7],
                        "6000": row[8], "8000": row[9]
                    }
                    oe_bone = {
                        "500": row[15], "1000": row[16],
                        "2000": row[17], "3000": row[18], "4000": row[19],
                        "6000": row[20], "8000": row[21]
                    }
                    last_exam_data['thresholds_od_bone'] = clean_dict(od_bone)
                    last_exam_data['thresholds_oe_bone'] = clean_dict(oe_bone)

            if last_exam_data:
                process_and_save_exam(supabase, last_exam_data)

            logs.append({"file": file.filename, "status": "success", "message": f"Importado com análise G2A Brain: {nome}"})

        except Exception as e:
            logs.append({"file": file.filename, "status": "error", "message": str(e)})

    return {"logs": logs}
