import pandas as pd
import numpy as np

df = pd.read_excel('../src/Casos/ROMERO FRANCISCO DA SILVA - 12114.xls', header=None)

def clean_val(v):
    if pd.isna(v): return None
    return str(v).strip()

row1 = [clean_val(x) for x in df.iloc[1].tolist()]
row2 = [clean_val(x) for x in df.iloc[2].tolist()]

matricula = next((x.replace('MATRICULA:', '').strip() for x in row1 if x and 'MATRICULA:' in x), None)
nome = next((x.replace('NOME:', '').strip() for x in row1 if x and 'NOME:' in x), None)
funcao = next((x.replace('FUNÇÃO:', '').strip() for x in row2 if x and 'FUNÇÃO:' in x), None)

print("Matricula:", matricula)
print("Nome:", nome)
print("Funcao:", funcao)

for i in range(6, len(df)):
    row = [clean_val(x) for x in df.iloc[i].tolist()]
    if not any(row): continue
    
    # check if row[1] is Date
    if row[1] and str(row[1]) != 'None':
        # Data is a datetime string like '2012-04-12 00:00:00'
        # Wait, if pandas parses it as Timestamp, clean_val will make it string
        print(f"Row {i} - Date: {row[1]}, Ref: {row[25]}, Status: {row[24]}")
        
        od_air = { "250": row[2], "500": row[3] }
        print("od_air:", od_air)
    elif row[3] and str(row[3]) != 'None':
        # Bone
        print(f"Row {i} - Bone: {row[3]}")

