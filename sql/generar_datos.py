import os
import csv
import random
from datetime import datetime, timedelta

# Configuración de rutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATOS_DIR = os.path.join(BASE_DIR, 'datos')
os.makedirs(DATOS_DIR, exist_ok=True)

# Configuración de aleatoriedad para reproducibilidad
random.seed(42)

# 1. Catálogos Básicos
ROLES = [
    (1, 'Administrador', 'all', 'Administrador del sistema con acceso total'),
    (2, 'Epidemiologo', 'validar_casos,ver_dashboard,ejecutar_pronosticos,exportar_reportes', 'Epidemiólogo encargado de vigilancia y análisis'),
    (3, 'Notificador', 'registrar_casos,editar_casos,consultar_casos', 'Personal de salud que notifica casos de dengue'),
    (4, 'Autoridad', 'ver_dashboard,exportar_reportes', 'Autoridad de salud con acceso de solo lectura al dashboard')
]

HASH_PASS = "pbkdf2:sha256:260000$Z7yqB9zN$1bc44f0bb6c12b9a71221147a4694b29bb8968ee8dc1f5f2479f648d8b9d3655" # hash de "sived123"

USUARIOS = [
    (1, 'admin', HASH_PASS, 'admin@sived.gob.pe', 1, None, True),
    (2, 'epidemio', HASH_PASS, 'epidemio@sived.gob.pe', 2, None, True),
    (3, 'notifica', HASH_PASS, 'notifica@sived.gob.pe', 3, 1, True), # profesional 1
    (4, 'autoridad', HASH_PASS, 'autoridad@sived.gob.pe', 4, None, True)
]

SEROTIPOS = [
    (1, 'DENV-1', 'Serotipo 1 del virus del dengue'),
    (2, 'DENV-2', 'Serotipo 2 del virus del dengue'),
    (3, 'DENV-3', 'Serotipo 3 del virus del dengue'),
    (4, 'DENV-4', 'Serotipo 4 del virus del dengue')
]

CLASIFICACIONES = [
    (1, 'Dengue sin senales de alarma', 'Caso con fiebre y síntomas generales sin complicaciones'),
    (2, 'Dengue con senales de alarma', 'Caso con dolor abdominal persistente, vómitos, acumulación de líquidos o sangrado'),
    (3, 'Dengue grave', 'Caso con choque por extravasación, sangrado grave o compromiso orgánico severo')
]

SINTOMAS = [
    (1, 'Fiebre'),
    (2, 'Cefalea'),
    (3, 'Dolor retroocular'),
    (4, 'Mialgias'),
    (5, 'Artralgias'),
    (6, 'Erupcion cutanea'),
    (7, 'Nauseas/Vomitos')
]

# 2. Departamentos (25 reales de Perú)
DEPARTAMENTOS_INFO = [
    ('PE01', 'Amazonas', -6.2294, -77.8728, 39249.1),
    ('PE02', 'Ancash', -9.5261, -77.5288, 35914.4),
    ('PE03', 'Apurimac', -13.6339, -72.8814, 20895.8),
    ('PE04', 'Arequipa', -16.4090, -71.5375, 63345.4),
    ('PE05', 'Ayacucho', -13.1588, -74.2239, 43814.8),
    ('PE06', 'Cajamarca', -7.1638, -78.5003, 33317.5),
    ('PE07', 'Callao', -12.0566, -77.1181, 146.9),
    ('PE08', 'Cusco', -13.5320, -71.9675, 71986.5),
    ('PE09', 'Huancavelica', -12.7873, -74.9726, 22131.5),
    ('PE10', 'Huanuco', -9.9306, -76.2422, 36848.9),
    ('PE11', 'Ica', -14.0678, -75.7286, 21327.8),
    ('PE12', 'Junin', -11.1582, -75.9931, 44197.2),
    ('PE13', 'La Libertad', -8.1160, -79.0060, 25500.0),
    ('PE14', 'Lambayeque', -6.7011, -79.9062, 14231.3),
    ('PE15', 'Lima', -12.0464, -77.0428, 34801.6),
    ('PE16', 'Loreto', -3.7496, -73.2538, 368852.0),
    ('PE17', 'Madre de Dios', -12.5933, -69.1891, 85300.5),
    ('PE18', 'Moquegua', -17.1983, -70.9357, 15734.3),
    ('PE19', 'Pasco', -10.6675, -76.2567, 25319.6),
    ('PE20', 'Piura', -5.1945, -80.6328, 35892.5),
    ('PE21', 'Puno', -15.8402, -70.0219, 71999.0),
    ('PE22', 'San Martin', -6.4851, -76.3725, 51253.3),
    ('PE23', 'Tacna', -18.0117, -70.2536, 16075.9),
    ('PE24', 'Tumbes', -3.5669, -80.4515, 4669.2),
    ('PE25', 'Ucayali', -8.3791, -74.5539, 102410.6)
]

dep_map = {
    'AMAZONAS': 'PE01', 'ANCASH': 'PE02', 'APURIMAC': 'PE03', 'AREQUIPA': 'PE04',
    'AYACUCHO': 'PE05', 'CAJAMARCA': 'PE06', 'CALLAO': 'PE07', 'CUSCO': 'PE08',
    'HUANCAVELICA': 'PE09', 'HUANUCO': 'PE10', 'ICA': 'PE11', 'JUNIN': 'PE12',
    'LA LIBERTAD': 'PE13', 'LAMBAYEQUE': 'PE14', 'LIMA': 'PE15', 'LORETO': 'PE16',
    'MADRE DE DIOS': 'PE17', 'MOQUEGUA': 'PE18', 'PASCO': 'PE19', 'PIURA': 'PE20',
    'PUNO': 'PE21', 'SAN MARTIN': 'PE22', 'TACNA': 'PE23', 'TUMBES': 'PE24',
    'UCAYALI': 'PE25'
}

# 3. Periodos Epidemiológicos (Semanas desde 2000 hasta 2026)
START_DATE = datetime(2000, 1, 2) # Primer domingo de 2000
PERIODOS = []
periodo_map = {}
p_date = START_DATE
period_id = 1

while p_date.year <= 2026:
    anio = p_date.year
    first_jan = datetime(anio, 1, 1)
    days_to_sunday = (6 - first_jan.weekday()) % 7
    first_sunday = first_jan + timedelta(days=days_to_sunday)
    week_num = int((p_date - first_sunday).days / 7) + 1
    
    fecha_inicio = p_date.strftime('%Y-%m-%d')
    fecha_fin = (p_date + timedelta(days=6)).strftime('%Y-%m-%d')
    
    PERIODOS.append((period_id, anio, week_num, fecha_inicio, fecha_fin))
    periodo_map[(anio, week_num)] = period_id
    
    p_date += timedelta(days=7)
    period_id += 1

print(f"Generados {len(PERIODOS)} periodos epidemiológicos (2000-2026).")

# 4. Mapeo Oficial de Fallecidos del CDC MINSA para 2022 y 2023
REAL_DEATHS = {
    'PE01': {2022: 2, 2023: 3},   # Amazonas
    'PE02': {2022: 1, 2023: 25},  # Ancash
    'PE03': {2022: 0, 2023: 0},   # Apurimac
    'PE04': {2022: 0, 2023: 0},   # Arequipa
    'PE05': {2022: 0, 2023: 0},   # Ayacucho
    'PE06': {2022: 3, 2023: 10},  # Cajamarca
    'PE07': {2022: 0, 2023: 4},   # Callao
    'PE08': {2022: 2, 2023: 1},   # Cusco
    'PE09': {2022: 0, 2023: 0},   # Huancavelica
    'PE10': {2022: 1, 2023: 3},   # Huanuco
    'PE11': {2022: 15, 2023: 45}, # Ica
    'PE12': {2022: 4, 2023: 5},   # Junin
    'PE13': {2022: 0, 2023: 60},  # La Libertad
    'PE14': {2022: 4, 2023: 110}, # Lambayeque
    'PE15': {2022: 2, 2023: 80},  # Lima
    'PE16': {2022: 10, 2023: 8},  # Loreto
    'PE17': {2022: 11, 2023: 2},  # Madre de Dios
    'PE18': {2022: 0, 2023: 0},   # Moquegua
    'PE19': {2022: 0, 2023: 1},   # Pasco
    'PE20': {2022: 31, 2023: 130},# Piura
    'PE21': {2022: 0, 2023: 0},   # Puno
    'PE22': {2022: 5, 2023: 8},   # San Martin
    'PE23': {2022: 0, 2023: 0},   # Tacna
    'PE24': {2022: 0, 2023: 15},  # Tumbes
    'PE25': {2022: 6, 2023: 12}   # Ucayali
}

# 5. Carga y Procesamiento del CSV Oficial
minsa_csv_path = "/Users/mac-mermitas/Documents/MAESTRIA/TRABAJO FINAL/datos_abiertos_vigilancia_dengue_2000_2024.csv"

# Paso 1: Leer el CSV para recolectar la geografía real y contar casos
print("Leyendo CSV del MINSA para extraer geografía y conteo de casos...")
unique_provs = {}  # dep_code -> set
unique_dists = {}  # (dep_code, prov_name) -> set
cases_count = {}   # (dep_code, year) -> int
cases_count_by_dep_per = {} # (dep_code, per_id) -> int

with open(minsa_csv_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
    reader = csv.reader(f, delimiter=';')
    headers = [h.strip().replace('\ufeff', '') for h in next(reader)]
    
    dep_idx = headers.index('departamento')
    prov_idx = headers.index('provincia')
    dist_idx = headers.index('distrito')
    ano_idx = headers.index('ano')
    semana_idx = headers.index('semana')
    
    for row in reader:
        if len(row) <= max(dep_idx, prov_idx, dist_idx, ano_idx, semana_idx):
            continue
            
        dep = row[dep_idx].strip().upper()
        prov = row[prov_idx].strip().upper() or "SIN ESPECIFICAR"
        dist = row[dist_idx].strip().upper() or "SIN ESPECIFICAR"
        
        try:
            year = int(row[ano_idx])
            week = int(row[semana_idx])
        except ValueError:
            continue
            
        dep_code = dep_map.get(dep)
        if not dep_code:
            continue
            
        # Geo
        if dep_code not in unique_provs:
            unique_provs[dep_code] = set()
        unique_provs[dep_code].add(prov)
        
        prov_key = (dep_code, prov)
        if prov_key not in unique_dists:
            unique_dists[prov_key] = set()
        unique_dists[prov_key].add(dist)
        
        # Conteo de casos para fallecidos
        key = (dep_code, year)
        cases_count[key] = cases_count.get(key, 0) + 1
        
        # Conteo de casos para alertas
        per_id = periodo_map.get((year, week))
        if not per_id:
            # Fallback
            per_id = periodo_map.get((year, 52)) or 1
        dep_per_key = (dep_code, per_id)
        cases_count_by_dep_per[dep_per_key] = cases_count_by_dep_per.get(dep_per_key, 0) + 1

# Agregar Huancavelica y Tacna que no registran casos en el CSV
for fallback_dep, fallback_prov, fallback_dist in [('PE09', 'HUANCAVELICA', 'HUANCAVELICA'), ('PE23', 'TACNA', 'TACNA')]:
    if fallback_dep not in unique_provs:
        unique_provs[fallback_dep] = {fallback_prov}
    prov_key = (fallback_dep, fallback_prov)
    if prov_key not in unique_dists:
        unique_dists[prov_key] = {fallback_dist}

print("Geografía cargada.")

# Construir PROVINCIAS
PROVINCIAS = []
prov_name_to_id = {}
p_idx = 1
for dep_code in sorted(unique_provs.keys()):
    dep_info = next(d for d in DEPARTAMENTOS_INFO if d[0] == dep_code)
    dep_lat, dep_lon = dep_info[2], dep_info[3]
    for prov_name in sorted(list(unique_provs[dep_code])):
        prov_id = f"P{p_idx:03d}"
        p_lat = dep_lat + random.uniform(-0.15, 0.15)
        p_lon = dep_lon + random.uniform(-0.15, 0.15)
        PROVINCIAS.append((prov_id, prov_name, dep_code, round(p_lat, 5), round(p_lon, 5)))
        prov_name_to_id[(dep_code, prov_name)] = prov_id
        p_idx += 1

# Construir DISTRITOS
DISTRITOS = []
dist_name_to_id = {}
d_idx = 1
for prov_key in sorted(unique_dists.keys()):
    dep_code, prov_name = prov_key
    prov_id = prov_name_to_id[prov_key]
    prov_info = next(p for p in PROVINCIAS if p[0] == prov_id)
    p_lat, p_lon = prov_info[3], prov_info[4]
    for dist_name in sorted(list(unique_dists[prov_key])):
        dist_id = f"D{d_idx:04d}"
        d_lat = p_lat + random.uniform(-0.05, 0.05)
        d_lon = p_lon + random.uniform(-0.05, 0.05)
        DISTRITOS.append((dist_id, dist_name, prov_id, round(d_lat, 5), round(d_lon, 5)))
        dist_name_to_id[(dep_code, prov_name, dist_name)] = dist_id
        d_idx += 1

print(f"Estructura territorial final: {len(PROVINCIAS)} provincias y {len(DISTRITOS)} distritos.")

# 6. Establecimientos y Profesionales
ESTABLECIMIENTOS = []
dist_to_est = {}
est_idx = 1
for dist in DISTRITOS:
    dist_id = dist[0]
    dist_name = dist[1]
    categoria = random.choice(['Puesto de Salud', 'Centro de Salud', 'Hospital I'])
    nombre_est = f"{categoria} {dist_name}"
    ESTABLECIMIENTOS.append((est_idx, nombre_est, categoria, dist_id))
    dist_to_est[dist_id] = est_idx
    est_idx += 1

PROFESIONALES = []
nombres_pool = ['Juan', 'Maria', 'Carlos', 'Ana', 'Luis', 'Pedro', 'Rosa', 'Jorge', 'Jose', 'Carmen', 'Sofia', 'Miguel', 'David', 'Laura', 'Elena', 'Diego']
apellidos_pool = ['Gomez', 'Rodriguez', 'Perez', 'Sanchez', 'Flores', 'Quispe', 'Mamani', 'Diaz', 'Ramos', 'García', 'Villanueva', 'Vargas', 'Castro', 'Chavez']
cargos = ['Medico', 'Enfermero', 'Tecnico de Laboratorio', 'Epidemiologo']

est_to_profs = {}
prof_idx = 1
for est in ESTABLECIMIENTOS:
    est_id = est[0]
    est_to_profs[est_id] = []
    for _ in range(2):
        nombres = random.choice(nombres_pool) + " " + random.choice(nombres_pool)
        apellidos = random.choice(apellidos_pool) + " " + random.choice(apellidos_pool)
        colegiatura = f"CMP{prof_idx:05d}" if prof_idx % 2 == 1 else f"CEP{prof_idx:05d}"
        cargo = random.choice(cargos)
        PROFESIONALES.append((prof_idx, nombres, apellidos, colegiatura, cargo, est_id))
        est_to_profs[est_id].append(prof_idx)
        prof_idx += 1

print(f"Cargados {len(ESTABLECIMIENTOS)} establecimientos de salud y {len(PROFESIONALES)} profesionales.")

# 7. Seleccionar Índices de Fallecidos Exactos para 2022 y 2023
death_indices = {}
for key, count in cases_count.items():
    dep_code, year = key
    if year in [2022, 2023]:
        deaths_needed = REAL_DEATHS.get(dep_code, {}).get(year, 0)
        if deaths_needed > 0:
            death_indices[key] = set(random.sample(range(count), min(deaths_needed, count)))

# 8. Streaming de Pacientes, Casos, Síntomas y Diagnósticos
print("Streaming de pacientes y casos desde MINSA CSV a archivos CSV locales...")

paciente_file = os.path.join(DATOS_DIR, 'paciente.csv')
caso_file = os.path.join(DATOS_DIR, 'caso_dengue.csv')
sintoma_file = os.path.join(DATOS_DIR, 'caso_signo.csv')
diagnostico_file = os.path.join(DATOS_DIR, 'diagnostico_laboratorio.csv')

processed_count = {}
pac_id = 1
caso_id = 1
diag_id = 1

f_pac = open(paciente_file, 'w', newline='', encoding='utf-8')
f_cas = open(caso_file, 'w', newline='', encoding='utf-8')
f_sin = open(sintoma_file, 'w', newline='', encoding='utf-8')
f_dia = open(diagnostico_file, 'w', newline='', encoding='utf-8')

w_pac = csv.writer(f_pac)
w_cas = csv.writer(f_cas)
w_sin = csv.writer(f_sin)
w_dia = csv.writer(f_dia)

w_pac.writerow(['id_paciente', 'documento', 'nombres', 'apellidos', 'fecha_nacimiento', 'sexo', 'id_distrito'])
w_cas.writerow(['id_caso', 'id_paciente', 'id_establecimiento', 'id_profesional', 'id_periodo', 'id_serotipo', 'id_clasificacion', 'fecha_notificacion', 'fecha_inicio_sintomas', 'tipo_diagnostico', 'condicion'])
w_sin.writerow(['id_caso', 'id_sintoma'])
w_dia.writerow(['id_diagnostico', 'id_caso', 'tipo_prueba', 'resultado', 'fecha_resultado'])

with open(minsa_csv_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
    reader = csv.reader(f, delimiter=';')
    next(reader) # skip headers
    
    for row in reader:
        if len(row) <= max(dep_idx, prov_idx, dist_idx, ano_idx, semana_idx):
            continue
            
        dep = row[dep_idx].strip().upper()
        prov = row[prov_idx].strip().upper() or "SIN ESPECIFICAR"
        dist = row[dist_idx].strip().upper() or "SIN ESPECIFICAR"
        
        try:
            year = int(row[ano_idx])
            week = int(row[semana_idx])
        except ValueError:
            continue
            
        dep_code = dep_map.get(dep)
        if not dep_code:
            continue
            
        # Get district ID
        dist_id = dist_name_to_id.get((dep_code, prov, dist))
        if not dist_id:
            # Safe fallback
            dist_id = DISTRITOS[0][0]
            
        # Get period ID
        per_id = periodo_map.get((year, week))
        if not per_id:
            # Fallback to week 52
            per_id = periodo_map.get((year, 52)) or 1
            
        # Get period start date
        per_start_str = PERIODOS[per_id - 1][3]
        per_start = datetime.strptime(per_start_str, '%Y-%m-%d')
        
        # Patient details
        edad_str = row[headers.index('edad')].strip()
        tipo_edad = row[headers.index('tipo_edad')].strip().upper()
        sexo = row[headers.index('sexo')].strip().upper()
        
        try:
            edad = int(edad_str)
            if edad < 0 or edad > 120:
                edad = 25
        except ValueError:
            edad = 25
            
        edad_years = edad if tipo_edad == 'A' else 0
        if sexo not in ['M', 'F']:
            sexo = 'F' if caso_id % 2 == 0 else 'M'
            
        # Documento y Nombres
        documento = f"{10000000 + pac_id}"
        nombres = f"{nombres_pool[pac_id % len(nombres_pool)]} {nombres_pool[(pac_id + 3) % len(nombres_pool)]}"
        apellidos = f"{apellidos_pool[pac_id % len(apellidos_pool)]} {apellidos_pool[(pac_id + 7) % len(apellidos_pool)]}"
        fecha_nacimiento = f"{year - edad_years}-06-15"
        
        w_pac.writerow([pac_id, documento, nombres, apellidos, fecha_nacimiento, sexo, dist_id])
        
        # Case Classification
        enfermedad = row[headers.index('enfermedad')].strip().upper()
        if 'GRAVE' in enfermedad:
            id_clasificacion = 3
        elif 'CON SIGNOS' in enfermedad or 'CON SEÑALES' in enfermedad:
            id_clasificacion = 2
        else:
            id_clasificacion = 1
            
        # Condition (Death distribution)
        key = (dep_code, year)
        p_count = processed_count.get(key, 0)
        processed_count[key] = p_count + 1
        
        if p_count in death_indices.get(key, set()):
            condicion = 'Fallecido'
            id_clasificacion = 3 # override classification to severe for deaths
        else:
            condicion = 'Vivo'
            
        # Dates
        fecha_notificacion = per_start + timedelta(days=caso_id % 7)
        fecha_inicio_sintomas = fecha_notificacion - timedelta(days=2 + (caso_id % 4))
        
        # Diagnosis and realistic weighted serotype distribution
        tipo_diagnostico = 'Confirmado' if caso_id % 3 != 0 else 'Probable'
        
        if caso_id % 5 < 2: # 40% of cases are typed
            rand_val = caso_id % 100
            if rand_val < 50:
                id_serotipo = 2  # DENV-2: 50%
            elif rand_val < 80:
                id_serotipo = 1  # DENV-1: 30%
            elif rand_val < 95:
                id_serotipo = 3  # DENV-3: 15%
            else:
                id_serotipo = 4  # DENV-4: 5%
        else:
            id_serotipo = None
            
        est_id = dist_to_est[dist_id]
        prof_id = est_to_profs[est_id][caso_id % 2]
        
        w_cas.writerow([
            caso_id,
            pac_id,
            est_id,
            prof_id,
            per_id,
            id_serotipo,
            id_clasificacion,
            fecha_notificacion.strftime('%Y-%m-%d'),
            fecha_inicio_sintomas.strftime('%Y-%m-%d'),
            tipo_diagnostico,
            condicion
        ])
        
        # Symptoms
        w_sin.writerow([caso_id, 1]) # Fever
        if caso_id % 5 == 0:
            w_sin.writerow([caso_id, 2]) # Headache
        if caso_id % 7 == 0:
            w_sin.writerow([caso_id, 3]) # Retroocular pain
            
        # Lab Diagnoses
        if caso_id % 10 == 0:
            tipo_prueba = 'RT-PCR' if caso_id % 30 == 0 else ('NS1' if caso_id % 20 == 0 else 'IgM')
            resultado = 'Positivo' if tipo_diagnostico == 'Confirmado' else 'Negativo'
            fecha_res = fecha_notificacion + timedelta(days=2)
            w_dia.writerow([diag_id, caso_id, tipo_prueba, resultado, fecha_res.strftime('%Y-%m-%d')])
            diag_id += 1
            
        pac_id += 1
        caso_id += 1

f_pac.close()
f_cas.close()
f_sin.close()
f_dia.close()

print(f"Streaming finalizado. Se han procesado {caso_id - 1} casos.")

# 9. Medidas Climáticas
print("Generando medidas climáticas...")
clima_perfiles = {}
for dep in DEPARTAMENTOS_INFO:
    dep_code = dep[0]
    lat = dep[2]
    temp_base = 25.0 - abs(lat) * 0.5
    if dep_code in ['PE16', 'PE25', 'PE17']: # Selva
        precip_base = 50.0
        temp_base = 26.5
    elif dep_code in ['PE20', 'PE24', 'PE14']: # Costa norte
        precip_base = 10.0
        temp_base = 24.5
    elif dep_code in ['PE21', 'PE18', 'PE04']: # Sierra sur
        precip_base = 8.0
        temp_base = 12.0
    else:
        precip_base = 15.0
    clima_perfiles[dep_code] = (temp_base, precip_base)

MEDIDAS_CLIMATICAS = []
medida_id = 1
import math

for dep in DEPARTAMENTOS_INFO:
    dep_code = dep[0]
    temp_base, precip_base = clima_perfiles[dep_code]
    for per in PERIODOS:
        per_id = per[0]
        anio = per[1]
        sem = per[2]
        
        factor_estacional = math.sin(2 * math.pi * (sem - 5) / 52)
        temp = temp_base + factor_estacional * 3.0 + random.uniform(-1.0, 1.0)
        precip = max(0.0, precip_base + factor_estacional * precip_base * 0.8 + random.uniform(-5.0, 10.0))
        
        if anio == 2023 and dep_code in ['PE20', 'PE24', 'PE14'] and sem in range(8, 20):
            temp += 3.5
            precip += random.uniform(50.0, 150.0)
            
        temp_max = temp + random.uniform(3.0, 6.0)
        MEDIDAS_CLIMATICAS.append((
            medida_id,
            dep_code,
            per_id,
            round(temp, 2),
            round(temp_max, 2),
            round(precip, 2)
        ))
        medida_id += 1

# 10. Predicciones / Alertas para 2024
print("Generando predicciones y alertas...")
PREDICCIONES = []
pred_id = 1
# Seleccionar los últimos periodos de 2024 (últimas 8 semanas)
ultimos_periodos = [p[0] for p in PERIODOS if p[1] == 2024][-8:]
deptos_clave = ['PE20', 'PE14', 'PE15', 'PE16', 'PE25', 'PE22', 'PE24', 'PE13']

for per_id in ultimos_periodos:
    for dep_code in deptos_clave:
        casos_reales = cases_count_by_dep_per.get((dep_code, per_id), 0)
        error = int(random.normalvariate(0, max(2, casos_reales * 0.15)))
        casos_predichos = max(0, casos_reales + error)
        casos_esperados = int(casos_reales * 0.8) + 2
        
        nivel_alerta = 'Normal'
        if casos_reales > casos_esperados * 1.3:
            nivel_alerta = 'Alerta'
        elif casos_reales > casos_esperados:
            nivel_alerta = 'Vigilancia'
            
        PREDICCIONES.append((
            pred_id,
            dep_code,
            per_id,
            casos_reales,
            casos_predichos,
            casos_esperados,
            nivel_alerta,
            random.choice(['SARIMA', 'Prophet']),
            round(random.uniform(1.2, 5.8), 2),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        pred_id += 1

# 11. Guardar archivos finales
def guardar_csv(filename, headers, rows):
    path = os.path.join(DATOS_DIR, filename)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"Archivo guardado: {filename} ({len(rows)} filas)")

guardar_csv('departamento.csv', ['id_departamento', 'nombre_departamento', 'latitud', 'longitud', 'area_km2'], DEPARTAMENTOS_INFO)
guardar_csv('provincia.csv', ['id_provincia', 'nombre_provincia', 'id_departamento', 'latitud', 'longitud'], PROVINCIAS)
guardar_csv('distrito.csv', ['id_distrito', 'nombre_distrito', 'id_provincia', 'latitud', 'longitud'], DISTRITOS)
guardar_csv('establecimiento_salud.csv', ['id_establecimiento', 'nombre_establecimiento', 'categoria', 'id_distrito'], ESTABLECIMIENTOS)
guardar_csv('profesional_salud.csv', ['id_profesional', 'nombres', 'apellidos', 'colegiatura', 'cargo', 'id_establecimiento'], PROFESIONALES)
guardar_csv('periodo_epidemiologico.csv', ['id_periodo', 'anio', 'numero_semana', 'fecha_inicio', 'fecha_fin'], PERIODOS)
guardar_csv('serotipo.csv', ['id_serotipo', 'codigo', 'descripcion'], SEROTIPOS)
guardar_csv('clasificacion_caso.csv', ['id_clasificacion', 'nombre', 'descripcion'], CLASIFICACIONES)
guardar_csv('signo_sintoma.csv', ['id_sintoma', 'nombre'], SINTOMAS)
guardar_csv('medida_climatica.csv', ['id_medida', 'id_departamento', 'id_periodo', 'temp_media_c', 'temp_max_c', 'precip_total_mm'], MEDIDAS_CLIMATICAS)
guardar_csv('prediccion_alerta.csv', ['id_prediccion', 'id_departamento', 'id_periodo', 'casos_observados', 'casos_predichos', 'casos_esperados', 'nivel_alerta', 'modelo', 'mae', 'generado_en'], PREDICCIONES)
guardar_csv('rol.csv', ['id_rol', 'nombre_rol', 'permisos', 'descripcion'], ROLES)
guardar_csv('usuario.csv', ['id_usuario', 'nombre_usuario', 'hash_contrasena', 'correo', 'id_rol', 'id_profesional', 'activo'], USUARIOS)

print("¡Generación de datos finalizada con éxito!")
