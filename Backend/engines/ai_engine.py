import os
from google import genai
from google.genai import types

class AIEngine:
    
    @staticmethod
    def generate_insights(clinical_data: dict, occupational_data: dict, employee_context: dict) -> str:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return "⚠️ Erro: GEMINI_API_KEY não configurada."
        
        client = genai.Client(api_key=api_key)
        
        alertas_reais = ', '.join(occupational_data['alerts']) if occupational_data.get('alerts') else 'Nenhum.'
        alertas_preventivos = ', '.join(occupational_data.get('preventive_alerts', [])) if occupational_data.get('preventive_alerts') else 'Nenhum.'
        
        analise_tritonal = occupational_data.get('analise_tritonal', {})
        analise_str = ""
        for ear, dados in analise_tritonal.items():
            if dados and dados.get('ref_346') is not None:
                pioras = ", ".join(map(str, dados.get('frequencias_isoladas_piora', [])))
                pioras_str = f"Frequências Isoladas com Piora (>=15dB): {pioras if pioras else 'Nenhuma'}"
                analise_str += f"""
        {ear} - Média 3,4,6kHz Atual: {dados.get('atual_346')}dB | Ref: {dados.get('ref_346')}dB
        {ear} - Média 500,1k,2k Atual: {dados.get('atual_512')}dB | Ref: {dados.get('ref_512')}dB
        {ear} - {pioras_str}"""

        contexto_tecnico = f"""
        [DADOS DO EXAME]
        Tipo de Exame: {employee_context.get('exam_type', 'Não informado')}
        
        [GRAUS CLÍNICOS (Média Tritonal e Altas Frequências)]
        OD: Grau: {clinical_data['od']['grau_oms']} | Média SS(500,1k,2k): {clinical_data['od'].get('media_oms', 'N/A')}dB | Média PCA(3k,4k,6k): {clinical_data['od'].get('media_pca_346', 'N/A')}dB
        OE: Grau: {clinical_data['oe']['grau_oms']} | Média SS(500,1k,2k): {clinical_data['oe'].get('media_oms', 'N/A')}dB | Média PCA(3k,4k,6k): {clinical_data['oe'].get('media_pca_346', 'N/A')}dB
        
        [ANÁLISE OCUPACIONAL]
        Status Geral (NR-07): {occupational_data['status']}
        Alertas Reais (> 25dB / Desencadeamentos / Agravamentos): {alertas_reais}
        Alertas Preventivos (Limites em 25dB): {alertas_preventivos}
        
        [COMPARAÇÃO COM EXAME DE REFERÊNCIA (DESENCADEAMENTO/AGRAVAMENTO)]{analise_str}
        """

        instrucoes_sistema = """
        Você é a G2A Brain, a autoridade técnica em Fonoaudiologia Ocupacional da plataforma.
        Seu objetivo é fornecer um parecer técnico preciso, elegante e direto para o prontuário.

        CRÍTICO:
        - O relatório e o parecer não devem conter seu nome como emissor ("G2A Brain" ou "IA"). O emissor final será o profissional que assinar o documento. Formule o texto de forma puramente técnica (Ex: "Observa-se...", "Nota-se...", "Recomenda-se...").
        - Não coloque sua assinatura.

        DIRETRIZES TÉCNICAS (STRICT COMPLIANCE):
        1. TERMINOLOGIA: Nunca utilize o termo "rebaixamento auditivo". Use "alteração", "perda" ou "limiar elevado".
        2. NORMALIDADE LEGAL: Se todos os limiares forem <= 25 dB, o exame é LEGALMENTE NORMAL perante a NR-07.
        3. VIGILÂNCIA PREVENTIVA: Se houver "Frequências no Limite (25dB)", o laudo é normal, mas você DEVE redigir uma nota clínica de cautela. Informe que, embora dentro da normalidade legal, o trabalhador atingiu o teto da zona crítica e requer atenção ao EPI.
        4. CONDUTA PAINPSE: Para casos sugestivos de PAINPSE, a prioridade é o repouso auditivo de 14h para confirmação.
        5. ANÁLISE PCA (3k, 4k, 6k): Avalie rigorosamente a "Média PCA". Se ela estiver superior à "Média SS", isso é um indicativo fortíssimo de entalhe acústico (início de PAINPSE/PAIR), mesmo que a Média SS dê o laudo como "Normal". Destaque esse risco no insight.

        PERSONA E TOM DE VOZ:
        - Use voz ativa e tom profissional-clínico (ex: "Observa-se...", "Recomenda-se...", "Conforme preconiza a NR-07...").
        - Evite introduções vazias como "Olá" ou "Sou uma IA". Vá direto ao parecer.
        - O Markdown deve ser limpo e scannable.
        - Não coloque citações no texto ex: [cite: 647]

        ESTRUTURA DO PARECER:
        ### 1. Impressão Clínica
        (Análise objetiva dos graus, lateralidade e disparidade entre Média Tritonal e Média PCA).

        ### 2. Enquadramento Ocupacional (NR-07)
        (Defina se o exame é Normal ou Sugestivo de PAINPSE/PAIR ou Agravamento/Desencadeamento).

        ### 3. Recomendações Técnicas
        (Ações práticas: Reteste, reforço de treinamento de EPI ou apenas monitoramento anual).
        """

        try:
            response = client.models.generate_content(
                model='gemma-4-31b-it', # Usando o Gemma 4 ~32b disponível na API do AI Studio
                contents=contexto_tecnico,
                config=types.GenerateContentConfig(
                    system_instruction=instrucoes_sistema,
                    temperature=0.0,
                )
            )
            return response.text
            
        except Exception as e:
            return f"⚠️ Erro ao gerar insights: {str(e)}"