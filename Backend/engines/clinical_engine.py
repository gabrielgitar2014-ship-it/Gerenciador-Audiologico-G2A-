import numpy as np

class ClinicalEngine:
    
    @staticmethod
    def evaluate(air_thresholds: dict, bone_thresholds: dict = None) -> dict:
        """
        Motor Clínico Principal.
        Recebe os dicionários de limiares (Aéreos e Ósseos) e devolve a classificação clínica.
        """
        # Agora a regra de classificação é SILMAN E SILVERMAN (1997) para graus.
        degree_info = ClinicalEngine._calculate_degree_silman_silverman(air_thresholds)
        loss_type = ClinicalEngine._determine_type(air_thresholds, bone_thresholds, degree_info['degree'])
        
        # Calcular média de altas frequências (3k, 4k, 6k) para a NR-7
        freqs_pca = [3000, 4000, 6000]
        vals_pca = ClinicalEngine._get_values(air_thresholds, freqs_pca)
        avg_pca = round(float(np.mean(vals_pca)), 1) if len(vals_pca) == 3 else None

        return {
            "grau_oms": degree_info['degree'],
            "media_oms": degree_info['avg'],
            "media_pca_346": avg_pca,
            "tipo_perda": loss_type
        }

    @staticmethod
    def _get_values(thresholds: dict, freqs: list):
        """Extrai os valores numéricos das frequências solicitadas."""
        if not thresholds:
            return []
        return [thresholds.get(str(f)) for f in freqs if thresholds.get(str(f)) is not None]

    @staticmethod
    def _calculate_degree_silman_silverman(air_thresholds: dict) -> dict:
        """
        Calcula o Grau da Perda Auditiva baseando-se em Silman e Silverman (1997).
        Critério: Média tritonais das frequências de 500 Hz, 1000 Hz e 2000 Hz.
        """
        freqs_ss = [500, 1000, 2000]
        all_freqs = [250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000]
        
        vals_ss = ClinicalEngine._get_values(air_thresholds, freqs_ss)
        all_vals = ClinicalEngine._get_values(air_thresholds, all_freqs)
        
        if len(vals_ss) < 3:
            return {"degree": "INCONCLUSIVO", "avg": None}

        avg = round(float(np.mean(vals_ss)), 1)
        max_threshold = max(all_vals) if all_vals else 0
        
        degree = "NORMAL"
        
        # Proteção contra "Médias Normais" com Frequências Isoladas caindo
        if avg <= 25: 
            if max_threshold > 25: 
                degree = "Perda em Freq. Isoladas"
            else:
                degree = "Audição Normal"
                
        elif 26 <= avg <= 40: degree = "Perda Leve"
        elif 41 <= avg <= 55: degree = "Perda Moderada"
        elif 56 <= avg <= 70: degree = "Perda Moderadamente Severa"
        elif 71 <= avg <= 90: degree = "Perda Severa"
        elif avg > 90: degree = "Perda Profunda"
        else: degree = "Perda Completa/Surdez"

        return {"degree": degree, "avg": avg}

    @staticmethod
    def _determine_type(air_thresholds: dict, bone_thresholds: dict, degree_str: str) -> str:
        """
        Calcula o Tipo da Perda (Topodiagnóstico).
        Critério: Silman e Silverman (1997) via análise de GAP Aéreo-Ósseo.
        """
        # Filtros de escape rápido (Não há o que classificar)
        if degree_str == "INCONCLUSIVO": return "INCONCLUSIVO"
        if degree_str == "Audição Normal": return "Audição Normal"
        if degree_str == "Perda em Freq. Isoladas": return "Indeterminado (Freq. Isolada)"

        if not bone_thresholds:
            return "Neurossensorial (Provável - Sem Via Óssea)"

        # Frequências usadas para avaliar o Gap clínico
        freqs = [500, 1000, 2000, 4000]
        air_vals = ClinicalEngine._get_values(air_thresholds, freqs)
        bone_vals = ClinicalEngine._get_values(bone_thresholds, freqs)

        if len(bone_vals) < len(air_vals):
             return "Neurossensorial (Dados de Via Óssea Insuficientes)"

        avg_air = np.mean(air_vals)
        avg_bone = np.mean(bone_vals)
        avg_gap = avg_air - avg_bone

        # Lógica de Silman & Silverman (1997)
        if avg_bone <= 15 and avg_gap >= 15:
            return "Perda Condutiva"
        elif avg_bone > 15 and avg_gap > 10:
            return "Perda Mista"
        else:
            return "Perda Neurossensorial"