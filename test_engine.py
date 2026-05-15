from schemas import ExamType

class OccupationalEngine:
    @staticmethod
    def calculate_average(ear_data, freqs):
        if not ear_data: return None
        values = [ear_data.get(str(f)) or ear_data.get(f) for f in freqs]
        values = [v for v in values if v is not None]
        if len(values) == len(freqs):
            return sum(values) / len(values)
        return None

    @staticmethod
    def evaluate(exam_data: dict, exam_type: str, reference_exam: dict = None) -> dict:
        exam_type_str = exam_type.value if hasattr(exam_type, 'value') else str(exam_type)
        od = exam_data.get('thresholds_od_air', {})
        oe = exam_data.get('thresholds_oe_air', {})
        
        alerts = []
        preventive_alerts = [] # NOVA LISTA: O Diferencial G2A
        status = "NORMAL"
        is_reference = False
        analise_tritonal = {"OD": {}, "OE": {}}

        def analyze_ear_nr07(ear_data, ear_label, ref_ear_data=None):
            if not ear_data: return False, False
            
            f3k = ear_data.get('3000') or ear_data.get(3000)
            f4k = ear_data.get('4000') or ear_data.get(4000)
            f6k = ear_data.get('6000') or ear_data.get(6000)
            
            criticas = [val for val in [f3k, f4k, f6k] if val is not None]
            pior_limiar = max(criticas) if criticas else None

            if pior_limiar == 25:
                preventive_alerts.append(f"{ear_label}: Limiar atingiu o limite máximo de normalidade (25 dB) nas frequências agudas.")

            has_alteration = (pior_limiar is not None and pior_limiar > 25)
            has_desencadeamento_or_agravamento = False
            
            if ref_ear_data:
                media_atual_346 = OccupationalEngine.calculate_average(ear_data, [3000, 4000, 6000])
                media_ref_346 = OccupationalEngine.calculate_average(ref_ear_data, [3000, 4000, 6000])
                
                media_atual_512 = OccupationalEngine.calculate_average(ear_data, [500, 1000, 2000])
                media_ref_512 = OccupationalEngine.calculate_average(ref_ear_data, [500, 1000, 2000])
                
                analise_tritonal[ear_label] = {
                    "atual_346": round(media_atual_346, 1) if media_atual_346 is not None else None,
                    "ref_346": round(media_ref_346, 1) if media_ref_346 is not None else None,
                    "atual_512": round(media_atual_512, 1) if media_atual_512 is not None else None,
                    "ref_512": round(media_ref_512, 1) if media_ref_512 is not None else None,
                    "frequencias_isoladas_piora": []
                }

                ref_freqs = [v for v in ref_ear_data.values() if v is not None]
                ref_is_normal = all(v <= 25 for v in ref_freqs) if ref_freqs else False

                piora_media_346 = (media_atual_346 is not None and media_ref_346 is not None) and (media_atual_346 - media_ref_346 >= 10)
                piora_media_512 = (media_atual_512 is not None and media_ref_512 is not None) and (media_atual_512 - media_ref_512 >= 10)

                piora_isolada_346 = False
                piora_isolada_geral = False
                
                for freq in [250, 500, 1000, 2000, 3000, 4000, 6000, 8000]:
                    v_atual = ear_data.get(str(freq)) or ear_data.get(freq)
                    v_ref = ref_ear_data.get(str(freq)) or ref_ear_data.get(freq)
                    if v_atual is not None and v_ref is not None:
                        if v_atual - v_ref >= 15:
                            analise_tritonal[ear_label]["frequencias_isoladas_piora"].append(freq)
                            piora_isolada_geral = True
                            if freq in [3000, 4000, 6000]:
                                piora_isolada_346 = True
                
                if ref_is_normal:
                    if piora_media_346 or piora_isolada_346:
                        alerts.append(f"{ear_label}: Desencadeamento de PAINPSE identificado.")
                        has_desencadeamento_or_agravamento = True
                else:
                    if piora_media_346 or piora_media_512 or piora_isolada_geral:
                        alerts.append(f"{ear_label}: Agravamento de PAINPSE identificado.")
                        has_desencadeamento_or_agravamento = True

            if has_alteration and not has_desencadeamento_or_agravamento and pior_limiar is not None:
                alerts.append(f"{ear_label}: Queda identificada nas frequências agudas ({pior_limiar} dB).")

            return has_alteration, has_desencadeamento_or_agravamento

        ref_od = reference_exam.get('thresholds_od_air', {}) if reference_exam else None
        ref_oe = reference_exam.get('thresholds_oe_air', {}) if reference_exam else None

        has_alteration_od, has_agravamento_od = analyze_ear_nr07(od, "OD", ref_od)
        has_alteration_oe, has_agravamento_oe = analyze_ear_nr07(oe, "OE", ref_oe)
        
        has_alteration = has_alteration_od or has_alteration_oe
        has_agravamento = has_agravamento_od or has_agravamento_oe

        if has_agravamento:
            status = "SUGESTIVO_PAINPSE"
        elif has_alteration:
            if exam_type_str.lower() == 'admissional':
                status = "ALTERADO_PREEXISTENTE"
            elif reference_exam:
                status = "ALTERADO_ESTAVEL"
            else:
                status = "SUGESTIVO_PAINPSE"
                
        if exam_type_str.lower() == 'admissional':
            is_reference = True
            
        return {
            "status": status,
            "alerts": alerts,
            "preventive_alerts": preventive_alerts,
            "is_reference": is_reference,
            "analise_tritonal": analise_tritonal
        }

print(OccupationalEngine.evaluate({'thresholds_od_air': {'3000': 40, '4000': 40, '6000': 40, '500': 10}}, 'periodico', {'thresholds_od_air': {'3000': 15, '4000': 15, '6000': 15, '500': 10}}))
