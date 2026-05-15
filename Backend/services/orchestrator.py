from schemas import ExamRequest
from engines.clinical_engine import ClinicalEngine
from engines.occupational_engine import OccupationalEngine
from engines.ai_engine import AIEngine

class ExamOrchestrator:
    
    @staticmethod
    def process(exam: ExamRequest, reference_exam: dict = None) -> dict:
        """
        O Maestro da operação.
        Recebe os dados brutos, coordena a chamada dos 3 motores na ordem correta
        e empacota o resultado final para o banco de dados.
        """
        
        # 1. Preparação dos Dados
        exam_dict = exam.model_dump(by_alias=True)
        od_air = exam_dict.get('thresholds_od_air', {})
        oe_air = exam_dict.get('thresholds_oe_air', {})
        od_bone = exam_dict.get('thresholds_od_bone')
        oe_bone = exam_dict.get('thresholds_oe_bone')
        
        # 2. Avaliação Clínica (O "Otorrino")
        clin_od = ClinicalEngine.evaluate(od_air, od_bone)
        clin_oe = ClinicalEngine.evaluate(oe_air, oe_bone)
        clinical_data = {"od": clin_od, "oe": clin_oe}
        
        # 3. Avaliação Ocupacional (A "NR-07")
        occ_data = OccupationalEngine.evaluate(exam_dict, exam.exam_type, reference_exam)
        
        # 4. Avaliação Qualitativa (A "Inteligência Artificial Gemini")
        employee_context = {"exam_type": exam.exam_type.value}
        ai_insights = AIEngine.generate_insights(clinical_data, occ_data, employee_context)
        
        # 5. Determinação do Status Macro (Para a coluna result_status do Banco)
        # O OccupationalEngine já traz o status correto (NORMAL, ALTERADO_PREEXISTENTE, SUGESTIVO_PAINPSE)
        # Se for puramente clínico (ex: perda condutiva), a gente ajusta aqui.
        final_status = occ_data['status']
        if final_status == 'NORMAL':
            if clin_od['grau_oms'] not in ["Audição Normal", "INCONCLUSIVO"] or clin_oe['grau_oms'] not in ["Audição Normal", "INCONCLUSIVO"]:
                final_status = 'ALTERADO_ESTAVEL' # Tem perda clínica, mas não é PAINPSE/PAIR
                
        # Converte para lowercase para bater com seu ENUM do Postgres (ex: sugestivo_painpse)
        final_status = final_status.lower()

        # 6. Empacotamento do JSON Rico
        diagnosis_full = {
            "clinico": clinical_data,
            "ocupacional": occ_data,
            "ai_insights": ai_insights
        }
        
        return {
            "is_reference": occ_data['is_reference'],
            "final_status": final_status,
            "diagnosis_text": diagnosis_full
        }