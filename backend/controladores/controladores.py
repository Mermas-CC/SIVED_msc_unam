from flask import Blueprint, request, jsonify, Response
from functools import wraps
from datetime import datetime
from psycopg2.extras import RealDictCursor
from backend.persistencia.repositorios import RepositorioUsuario, RepositorioCaso, RepositorioGeografia, RepositorioClima, RepositorioEstadistica, DatabaseConnection
from backend.modelos.persona import Paciente
from backend.modelos.entidades import CasoDengue, DiagnosticoLaboratorio, Usuario, PrediccionAlerta
from backend.servicios.servicios import ServicioClimaAPI, ModeloSARIMA, ModeloProphet, ModeloRegresion, ServicioAlerta
from backend.utilitarios.utilitarios import Hasher, ValidadorDatos, ExportadorReportes
import pandas as pd

auth_bp = Blueprint('auth', __name__)
casos_bp = Blueprint('casos', __name__)
geo_bp = Blueprint('geografia', __name__)
dash_bp = Blueprint('dashboard', __name__)
pron_bp = Blueprint('pronostico', __name__)
usr_bp = Blueprint('usuarios', __name__)

repo_usr = RepositorioUsuario()
repo_caso = RepositorioCaso()
repo_geo = RepositorioGeografia()
repo_clima = RepositorioClima()

# ---------- Middleware de Seguridad ----------

def token_requerido(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'mensaje': 'Token de acceso faltante'}), 401
            
        # Formato token simple: "sived-token-username"
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
            
        parts = token.split('-')
        if len(parts) < 3 or parts[0] != 'sived' or parts[1] != 'token':
            return jsonify({'mensaje': 'Token de acceso inválido'}), 401
            
        username = parts[2]
        usuario = repo_usr.buscar_por_nombre(username)
        if not usuario or not usuario.activo:
            return jsonify({'mensaje': 'Usuario no autorizado o inactivo'}), 401
            
        # Adjuntar usuario a la solicitud
        request.usuario_actual = usuario
        return f(*args, **kwargs)
    return decorated

def requiere_roles(*roles_permitidos):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            usuario = getattr(request, 'usuario_actual', None)
            if not usuario:
                return jsonify({'mensaje': 'Usuario no autenticado'}), 401
                
            rol = repo_usr.buscar_rol_por_id(usuario.id_rol)
            if not rol or rol.nombre_rol not in roles_permitidos:
                return jsonify({'mensaje': 'Acceso denegado: permisos insuficientes para este rol'}), 403
                
            return f(*args, **kwargs)
        return decorated
    return decorator


# ---------- 1. Controladores de Autenticación ----------

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'mensaje': 'Usuario y contraseña requeridos'}), 400
        
    usuario = repo_usr.buscar_por_nombre(username)
    if not usuario or not usuario.activo:
        return jsonify({'mensaje': 'Credenciales incorrectas o cuenta inactiva'}), 401
        
    # Verificar contraseña hasheada
    # Para facilitar las pruebas con los datos precargados que tienen sived123 hasheado:
    if not Hasher.verificar_password(password, usuario.hash_contrasena):
        # Fallback simple por si se generó otro hash o texto plano para testing
        if password != 'sived123' and password != usuario.hash_contrasena:
            return jsonify({'mensaje': 'Credenciales incorrectas'}), 401
            
    rol = repo_usr.buscar_rol_por_id(usuario.id_rol)
    
    # Generar token simple
    token = f"sived-token-{usuario.nombre_usuario}-{usuario.id_rol}"
    
    return jsonify({
        'token': token,
        'usuario': {
            'username': usuario.nombre_usuario,
            'correo': usuario.correo,
            'rol': rol.nombre_rol,
            'permisos': rol.permisos.split(',')
        }
    })

@auth_bp.route('/me', methods=['GET'])
@token_requerido
def get_current_user():
    usuario = request.usuario_actual
    rol = repo_usr.buscar_rol_por_id(usuario.id_rol)
    return jsonify({
        'username': usuario.nombre_usuario,
        'correo': usuario.correo,
        'rol': rol.nombre_rol,
        'permisos': rol.permisos.split(',')
    })


# ---------- 2. Controladores de Geografía y Catálogos ----------

@geo_bp.route('/departamentos', methods=['GET'])
def get_departamentos():
    deptos = repo_geo.listar_departamentos()
    return jsonify([d.__dict__ for d in deptos])

@geo_bp.route('/provincias', methods=['GET'])
def get_provincias():
    depto_id = request.args.get('id_departamento')
    provs = repo_geo.listar_provincias(depto_id)
    return jsonify([p.__dict__ for p in provs])

@geo_bp.route('/distritos', methods=['GET'])
def get_distritos():
    prov_id = request.args.get('id_provincia')
    dists = repo_geo.listar_distritos(prov_id)
    return jsonify([d.__dict__ for d in dists])

@geo_bp.route('/establecimientos', methods=['GET'])
def get_establecimientos():
    dist_id = request.args.get('id_distrito')
    ests = repo_geo.listar_establecimientos(dist_id)
    return jsonify([e.__dict__ for e in ests])

@geo_bp.route('/profesionales', methods=['GET'])
def get_profesionales():
    est_id = request.args.get('id_establecimiento')
    profs = repo_geo.listar_profesionales(est_id)
    return jsonify([{
        'id_profesional': p.id,
        'nombre_completo': p.get_nombre_completo(),
        'colegiatura': p.colegiatura,
        'cargo': p.cargo,
        'id_establecimiento': p.id_establecimiento
    } for p in profs])

@geo_bp.route('/catalogos', methods=['GET'])
def get_catalogos():
    serotipos = repo_geo.listar_serotipos()
    clasificaciones = repo_geo.listar_clasificaciones()
    sintomas = repo_geo.listar_sintomas()
    
    return jsonify({
        'serotipos': [s.__dict__ for s in serotipos],
        'clasificaciones': [c.__dict__ for c in clasificaciones],
        'sintomas': [ss.__dict__ for ss in sintomas]
    })


# ---------- 3. Controladores de Casos (CRUD) ----------

@casos_bp.route('', methods=['GET'])
@token_requerido
def get_casos():
    depto_id = request.args.get('id_departamento')
    prov_id = request.args.get('id_provincia')
    dist_id = request.args.get('id_distrito')
    anio = request.args.get('anio')
    semana = request.args.get('semana')
    serotipo_id = request.args.get('id_serotipo')
    clasificacion_id = request.args.get('id_clasificacion')
    
    casos = repo_caso.buscar_filtrado(depto_id, prov_id, dist_id, anio, semana, serotipo_id, clasificacion_id)
    return jsonify(casos)

@casos_bp.route('/<int:id_caso>', methods=['GET'])
@token_requerido
def get_caso(id_caso):
    caso = repo_caso.buscar_por_id(id_caso)
    if not caso:
        return jsonify({'mensaje': 'Caso no encontrado'}), 404
        
    # Buscar paciente
    paciente = repo_caso.buscar_paciente_por_dni(None) # En repositorios.py buscamos por ID o DNI
    # Obtener paciente por id_paciente
    conn = DatabaseConnection.get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM paciente WHERE id_paciente = %s", (caso.id_paciente,))
        pac_row = cur.fetchone()
    finally:
        cur.close()
        conn.close()
        
    pac_dict = {}
    if pac_row:
        pac_dict = {
            'id_paciente': pac_row['id_paciente'],
            'documento': pac_row['documento'],
            'nombres': pac_row['nombres'],
            'apellidos': pac_row['apellidos'],
            'fecha_nacimiento': str(pac_row['fecha_nacimiento']),
            'sexo': pac_row['sexo'],
            'id_distrito': pac_row['id_distrito']
        }

    return jsonify({
        'id_caso': caso.id_caso,
        'id_paciente': caso.id_paciente,
        'id_establecimiento': caso.id_establecimiento,
        'id_profesional': caso.id_profesional,
        'id_periodo': caso.id_periodo,
        'id_serotipo': caso.id_serotipo,
        'id_clasificacion': caso.id_clasificacion,
        'fecha_notificacion': str(caso.fecha_notificacion),
        'fecha_inicio_sintomas': str(caso.fecha_inicio_sintomas) if caso.fecha_inicio_sintomas else None,
        'tipo_diagnostico': caso.tipo_diagnostico,
        'condicion': caso.condicion,
        'sintomas': [s.id_sintoma for s in caso.sintomas],
        'diagnosticos_lab': [{
            'tipo_prueba': d.tipo_prueba,
            'resultado': d.resultado,
            'fecha_resultado': str(d.fecha_resultado) if d.fecha_resultado else None
        } for d in caso.diagnosticos_lab],
        'paciente': pac_dict
    })

@casos_bp.route('/paciente/buscar/<string:dni>', methods=['GET'])
@token_requerido
def get_paciente_by_dni(dni):
    paciente = repo_caso.buscar_paciente_por_dni(dni)
    if not paciente:
        return jsonify({'mensaje': 'Paciente no encontrado'}), 404
        
    return jsonify({
        'id_paciente': paciente.id,
        'documento': paciente.documento,
        'nombres': paciente.nombres,
        'apellidos': paciente.apellidos,
        'fecha_nacimiento': str(paciente.fecha_nacimiento),
        'sexo': paciente.sexo,
        'id_distrito': paciente.id_distrito,
        'edad': paciente.calcular_edad()
    })

@casos_bp.route('', methods=['POST'])
@token_requerido
@requiere_roles('Administrador', 'Epidemiologo', 'Notificador')
def crear_caso():
    data = request.get_json()
    
    # 1. Validaciones
    dni = data.get('paciente_documento')
    if not ValidadorDatos.validar_dni(dni):
        return jsonify({'mensaje': 'Documento de identidad (DNI) inválido'}), 400
        
    f_ini_sint = data.get('fecha_inicio_sintomas')
    f_notif = data.get('fecha_notificacion', datetime.now().strftime('%Y-%m-%d'))
    if not ValidadorDatos.validar_fechas(f_ini_sint, f_notif):
        return jsonify({'mensaje': 'La fecha de inicio de síntomas debe ser menor o igual a la fecha de notificación'}), 400

    # 2. Guardar o actualizar Paciente
    paciente = repo_caso.buscar_paciente_por_dni(dni)
    if not paciente:
        paciente = Paciente(
            id_paciente=None,
            documento=dni,
            nombres=data.get('paciente_nombres'),
            apellidos=data.get('paciente_apellidos'),
            fecha_nacimiento=data.get('paciente_fecha_nacimiento'),
            sexo=data.get('paciente_sexo'),
            id_distrito=data.get('paciente_id_distrito')
        )
        paciente = repo_caso.guardar_paciente(paciente)
    else:
        # Actualizar datos si han cambiado
        paciente.nombres = data.get('paciente_nombres', paciente.nombres)
        paciente.apellidos = data.get('paciente_apellidos', paciente.apellidos)
        paciente.fecha_nacimiento = data.get('paciente_fecha_nacimiento', paciente.fecha_nacimiento)
        paciente.sexo = data.get('paciente_sexo', paciente.sexo)
        paciente.id_distrito = data.get('paciente_id_distrito', paciente.id_distrito)
        repo_caso.guardar_paciente(paciente)

    # Buscar periodo epidemiológico correspondiente a la fecha de notificación
    periodo = repo_clima.buscar_periodo_por_fecha(f_notif)
    if not periodo:
        # Si no existe, usar el último periodo
        periodo = repo_clima.buscar_ultimo_periodo_epidemiologico()

    # 3. Crear CasoDengue
    sintomas_ids = data.get('sintomas', [])
    sintomas = [SignoSintoma(sid, '') for sid in sintomas_ids]
    
    lab_data = data.get('diagnosticos_lab', [])
    diagnosticos = [
        DiagnosticoLaboratorio(
            id_diagnostico=None,
            id_caso=None,
            tipo_prueba=ld.get('tipo_prueba'),
            resultado=ld.get('resultado'),
            fecha_resultado=ld.get('fecha_resultado')
        )
        for ld in lab_data
    ]

    caso = CasoDengue(
        id_caso=None,
        id_paciente=paciente.id,
        id_establecimiento=data.get('id_establecimiento'),
        id_profesional=data.get('id_profesional'),
        id_periodo=periodo.id_periodo,
        id_serotipo=data.get('id_serotipo') if data.get('id_serotipo') != "" else None,
        id_clasificacion=data.get('id_clasificacion'),
        fecha_notificacion=f_notif,
        fecha_inicio_sintomas=f_ini_sint,
        tipo_diagnostico=data.get('tipo_diagnostico'),
        condicion=data.get('condicion', 'Vivo'),
        sintomas=sintomas,
        diagnosticos_lab=diagnosticos
    )
    
    repo_caso.guardar(caso)
    
    return jsonify({'mensaje': 'Caso registrado con éxito', 'id_caso': caso.id_caso}), 201

@casos_bp.route('/<int:id_caso>', methods=['PUT'])
@token_requerido
@requiere_roles('Administrador', 'Epidemiologo', 'Notificador')
def editar_caso(id_caso):
    caso_existente = repo_caso.buscar_por_id(id_caso)
    if not caso_existente:
        return jsonify({'mensaje': 'Caso no encontrado'}), 404
        
    data = request.get_json()
    
    # Validar fechas
    f_ini_sint = data.get('fecha_inicio_sintomas')
    f_notif = data.get('fecha_notificacion', caso_existente.fecha_notificacion)
    if not ValidadorDatos.validar_fechas(f_ini_sint, f_notif):
        return jsonify({'mensaje': 'La fecha de inicio de síntomas debe ser menor o igual a la fecha de notificación'}), 400

    # Actualizar paciente
    dni = data.get('paciente_documento')
    paciente = repo_caso.buscar_paciente_por_dni(dni)
    if paciente:
        paciente.nombres = data.get('paciente_nombres', paciente.nombres)
        paciente.apellidos = data.get('paciente_apellidos', paciente.apellidos)
        paciente.fecha_nacimiento = data.get('paciente_fecha_nacimiento', paciente.fecha_nacimiento)
        paciente.sexo = data.get('paciente_sexo', paciente.sexo)
        paciente.id_distrito = data.get('paciente_id_distrito', paciente.id_distrito)
        repo_caso.guardar_paciente(paciente)

    # Actualizar periodo
    periodo = repo_clima.buscar_periodo_por_fecha(f_notif)
    id_periodo = periodo.id_periodo if periodo else caso_existente.id_periodo

    # Actualizar síntomas
    sintomas_ids = data.get('sintomas', [])
    sintomas = [SignoSintoma(sid, '') for sid in sintomas_ids]
    
    # Actualizar diagnósticos lab
    lab_data = data.get('diagnosticos_lab', [])
    diagnosticos = [
        DiagnosticoLaboratorio(
            id_diagnostico=None,
            id_caso=id_caso,
            tipo_prueba=ld.get('tipo_prueba'),
            resultado=ld.get('resultado'),
            fecha_resultado=ld.get('fecha_resultado')
        )
        for ld in lab_data
    ]

    caso_existente.id_establecimiento = data.get('id_establecimiento', caso_existente.id_establecimiento)
    caso_existente.id_profesional = data.get('id_profesional', caso_existente.id_profesional)
    caso_existente.id_periodo = id_periodo
    caso_existente.id_serotipo = data.get('id_serotipo') if data.get('id_serotipo') != "" else None
    caso_existente.id_clasificacion = data.get('id_clasificacion', caso_existente.id_clasificacion)
    caso_existente.fecha_notificacion = f_notif
    caso_existente.fecha_inicio_sintomas = f_ini_sint
    caso_existente.tipo_diagnostico = data.get('tipo_diagnostico', caso_existente.tipo_diagnostico)
    caso_existente.condicion = data.get('condicion', caso_existente.condicion)
    caso_existente.sintomas = sintomas
    caso_existente.diagnosticos_lab = diagnosticos

    repo_caso.guardar(caso_existente)
    return jsonify({'mensaje': 'Caso actualizado con éxito'})

@casos_bp.route('/<int:id_caso>', methods=['DELETE'])
@token_requerido
@requiere_roles('Administrador', 'Epidemiologo')
def eliminar_caso(id_caso):
    success = repo_caso.eliminar_caso(id_caso)
    if success:
        return jsonify({'mensaje': 'Caso eliminado con éxito'})
    return jsonify({'mensaje': 'Error al eliminar caso'}), 500


# ---------- 4. Controladores de Dashboard e Indicadores ----------

@dash_bp.route('/indicadores', methods=['GET'])
@token_requerido
def get_indicadores():
    depto_id = request.args.get('id_departamento')
    prov_id = request.args.get('id_provincia')
    dist_id = request.args.get('id_distrito')
    anio = request.args.get('anio')
    semana_inicio = request.args.get('semana_inicio')
    semana_fin = request.args.get('semana_fin')
    
    resumen = RepositorioEstadistica.obtener_resumen_indicadores(
        depto_id=depto_id, prov_id=prov_id, dist_id=dist_id,
        anio=anio, semana_inicio=semana_inicio, semana_fin=semana_fin
    )
    return jsonify(resumen)

@dash_bp.route('/graficos/casos-semanales', methods=['GET'])
@token_requerido
def get_casos_semanales():
    depto_id = request.args.get('id_departamento')
    prov_id = request.args.get('id_provincia')
    dist_id = request.args.get('id_distrito')
    anio = request.args.get('anio')
    semana_inicio = request.args.get('semana_inicio')
    semana_fin = request.args.get('semana_fin')
    
    res = RepositorioEstadistica.obtener_casos_semanales(
        depto_id=depto_id, prov_id=prov_id, dist_id=dist_id,
        anio=anio, semana_inicio=semana_inicio, semana_fin=semana_fin
    )
    return jsonify(res)

@dash_bp.route('/graficos/serotipos', methods=['GET'])
@token_requerido
def get_dist_serotipos():
    depto_id = request.args.get('id_departamento')
    prov_id = request.args.get('id_provincia')
    dist_id = request.args.get('id_distrito')
    anio = request.args.get('anio')
    semana_inicio = request.args.get('semana_inicio')
    semana_fin = request.args.get('semana_fin')
    
    res = RepositorioEstadistica.obtener_distribucion_serotipos(
        depto_id=depto_id, prov_id=prov_id, dist_id=dist_id,
        anio=anio, semana_inicio=semana_inicio, semana_fin=semana_fin
    )
    return jsonify(res)

@dash_bp.route('/graficos/letalidad', methods=['GET'])
@token_requerido
def get_letalidad():
    depto_id = request.args.get('id_departamento')
    prov_id = request.args.get('id_provincia')
    dist_id = request.args.get('id_distrito')
    anio = request.args.get('anio')
    semana_inicio = request.args.get('semana_inicio')
    semana_fin = request.args.get('semana_fin')
    
    res = RepositorioEstadistica.obtener_letalidad_departamentos(
        depto_id=depto_id, prov_id=prov_id, dist_id=dist_id,
        anio=anio, semana_inicio=semana_inicio, semana_fin=semana_fin
    )
    return jsonify(res)

@dash_bp.route('/graficos/sintomas', methods=['GET'])
@token_requerido
def get_sintomas_stat():
    depto_id = request.args.get('id_departamento')
    prov_id = request.args.get('id_provincia')
    dist_id = request.args.get('id_distrito')
    anio = request.args.get('anio')
    semana_inicio = request.args.get('semana_inicio')
    semana_fin = request.args.get('semana_fin')
    
    res = RepositorioEstadistica.obtener_distribucion_sintomas(
        depto_id=depto_id, prov_id=prov_id, dist_id=dist_id,
        anio=anio, semana_inicio=semana_inicio, semana_fin=semana_fin
    )
    return jsonify(res)

@dash_bp.route('/exportar/<string:formato>', methods=['GET'])
@token_requerido
@requiere_roles('Administrador', 'Epidemiologo', 'Autoridad')
def exportar_reporte(formato):
    depto_id = request.args.get('id_departamento')
    prov_id = request.args.get('id_provincia')
    dist_id = request.args.get('id_distrito')
    anio = request.args.get('anio')
    semana_inicio = request.args.get('semana_inicio')
    semana_fin = request.args.get('semana_fin')
    
    # Traer datos de los casos filtrados
    casos = repo_caso.buscar_filtrado(
        depto_id=depto_id, prov_id=prov_id, dist_id=dist_id,
        anio=anio, semana=semana_fin
    )
    
    encabezados = ['ID Caso', 'Paciente DNI', 'Paciente Nombres', 'Establecimiento', 'Fecha Notificación', 'Diagnóstico', 'Clasificación', 'Condición']
    filas = [
        [c['id_caso'], c['documento'], f"{c['pac_nombres']} {c['pac_apellidos']}", c['nombre_establecimiento'], 
         str(c['fecha_notificacion']), c['tipo_diagnostico'], c['clasificacion_nombre'], c['condicion']]
        for c in casos
    ]
    
    titulo = "Reporte de Casos de Vigilancia de Dengue"
    if depto_id:
        deptos = repo_geo.listar_departamentos()
        depto_nom = next((d.nombre_departamento for d in deptos if d.id_departamento == depto_id), depto_id)
        titulo += f" - Departamento: {depto_nom}"

    if formato == 'csv':
        csv_content = ExportadorReportes.exportar_csv(encabezados, filas)
        return Response(
            csv_content,
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=reporte_dengue.csv"}
        )
    elif formato == 'pdf':
        pdf_bytes = ExportadorReportes.exportar_pdf(titulo, encabezados, filas)
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={"Content-disposition": "attachment; filename=reporte_dengue.pdf"}
        )
    else:
        return jsonify({'mensaje': 'Formato no soportado (use csv o pdf)'}), 400


# ---------- 5. Controladores de Pronóstico y Clima ----------

@pron_bp.route('/sincronizar-clima', methods=['POST'])
@token_requerido
@requiere_roles('Administrador', 'Epidemiologo')
def sincronizar_clima():
    data = request.get_json()
    depto_id = data.get('id_departamento')
    
    if not depto_id:
        return jsonify({'mensaje': 'ID de departamento requerido'}), 400
        
    # Buscar coordenadas del departamento
    deptos = repo_geo.listar_departamentos()
    depto = next((d for d in deptos if d.id_departamento == depto_id), None)
    if not depto:
        return jsonify({'mensaje': 'Departamento no encontrado'}), 404
        
    servicio_clima = ServicioClimaAPI()
    guardados = servicio_clima.sincronizar_clima_departamento(depto.id_departamento, depto.latitud, depto.longitud)
    
    return jsonify({
        'mensaje': 'Sincronización de clima completada',
        'registros_sincronizados': guardados
    })

@pron_bp.route('/predecir/<string:id_departamento>', methods=['POST'])
@token_requerido
@requiere_roles('Administrador', 'Epidemiologo')
def predecir_casos(id_departamento):
    data = request.get_json() or {}
    modelo_tipo = data.get('modelo', 'SARIMA') # SARIMA, Prophet, Regresion
    horizonte = data.get('horizonte', 8)
    
    # 1. Obtener serie histórica de casos de este departamento
    casos_semanales = RepositorioEstadistica.obtener_casos_semanales(id_departamento)
    if len(casos_semanales) < 5:
        return jsonify({'mensaje': 'Datos históricos insuficientes para entrenar el modelo de predicción (mínimo 5 semanas)'}), 400
        
    # 2. Obtener clima histórico
    conn = DatabaseConnection.get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute(
            """
            SELECT mc.temp_media_c AS temp_media, mc.precip_total_mm AS precip, pe.id_periodo
            FROM medida_climatica mc
            JOIN periodo_epidemiologico pe ON mc.id_periodo = pe.id_periodo
            WHERE mc.id_departamento = %s
            ORDER BY mc.id_periodo
            """,
            (id_departamento,)
        )
        clima_rows = cur.fetchall()
    finally:
        cur.close()
        conn.close()

    # Alinear casos y clima en un DataFrame
    df_casos = pd.DataFrame(casos_semanales)
    df_clima = pd.DataFrame(clima_rows)
    
    if df_clima.empty:
        # Simular clima histórico para alineación
        df_clima = pd.DataFrame({
            'temp_media': [24.0] * len(df_casos),
            'precip': [15.0] * len(df_casos)
        })
        
    # Ajustamos tamaño
    min_len = min(len(df_casos), len(df_clima))
    df_hist = pd.DataFrame({
        'casos': df_casos['casos'].iloc[-min_len:].values,
        'temp_media': df_clima['temp_media'].iloc[-min_len:].values,
        'precip': df_clima['precip'].iloc[-min_len:].values
    })
    
    # 3. Elegir e instanciar modelo de manera polimórfica (POO)
    if modelo_tipo == 'SARIMA':
        modelo = ModeloSARIMA()
    elif modelo_tipo == 'Prophet':
        modelo = ModeloProphet()
    else:
        modelo = ModeloRegresion()
        
    # Entrenar
    modelo.entrenar(df_hist)
    
    # Predecir
    resultado = modelo.predecir(horizonte)
    valores_predichos = resultado['valores']
    mae = resultado['mae']
    
    # 4. Generar predicciones y alertas en base de datos para los periodos futuros
    # Obtener los siguientes periodos epidemiológicos en la base de datos
    ultimo_periodo_id = int(df_casos.index[-1]) + 1 # simple
    conn = DatabaseConnection.get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT id_periodo FROM periodo_epidemiologico WHERE id_periodo > (SELECT MAX(id_periodo) FROM caso_dengue WHERE id_establecimiento IN (SELECT id_establecimiento FROM establecimiento_salud e JOIN distrito d ON e.id_distrito = d.id_distrito JOIN provincia pr ON d.id_provincia = pr.id_provincia WHERE pr.id_departamento = %s)) ORDER BY id_periodo LIMIT %s", (id_departamento, horizonte))
        futuro_periodos = [r['id_periodo'] for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()
        
    if len(futuro_periodos) < horizonte:
        # Generar ids periodos secuenciales por si no hay cargados a futuro
        max_id = max(df_casos.index) if not df_casos.empty else 523
        futuro_periodos = [int(max_id) + 1 + i for i in range(horizonte)]
        
    alertas_generadas = []
    # Guardamos las predicciones y calculamos alertas
    for i in range(horizonte):
        per_id = futuro_periodos[i]
        pred_casos = valores_predichos[i]
        
        # Umbral histórico esperado: aproximación (promedio móvil histórico del departamento)
        casos_esperados = int(df_hist['casos'].mean() * 0.9) + 3
        
        nivel_alerta = ServicioAlerta.evaluar_nivel_alerta(pred_casos, casos_esperados)
        
        pred_obj = PrediccionAlerta(
            id_prediccion=None,
            id_departamento=id_departamento,
            id_periodo=per_id,
            casos_observados=None, # no observado todavía
            casos_predichos=pred_casos,
            casos_esperados=casos_esperados,
            nivel_alerta=nivel_alerta,
            modelo=modelo_tipo,
            mae=mae
        )
        
        repo_clima.guardar_prediccion(pred_obj)
        alertas_generadas.append({
            'periodo': per_id,
            'casos_predichos': pred_casos,
            'casos_esperados': casos_esperados,
            'nivel_alerta': nivel_alerta
        })
        
    return jsonify({
        'modelo': modelo_tipo,
        'mae': mae,
        'predicciones': alertas_generadas
    })

@pron_bp.route('/alertas/<string:id_departamento>', methods=['GET'])
@token_requerido
def get_alertas(id_departamento):
    predicciones = repo_clima.listar_predicciones(id_departamento)
    return jsonify(predicciones)

def map_names_to_ids(depto_name, prov_name, dist_name):
    conn = DatabaseConnection.get_connection()
    cur = conn.cursor()
    depto_id = None
    prov_id = None
    dist_id = None
    try:
        if depto_name:
            depto_name = depto_name.strip()
        if prov_name:
            prov_name = prov_name.strip()
        if dist_name:
            dist_name = dist_name.strip()
            
        if depto_name:
            cur.execute("SELECT id_departamento FROM departamento WHERE LOWER(nombre_departamento) = LOWER(%s)", (depto_name,))
            res = cur.fetchone()
            if res:
                depto_id = res[0]
            else:
                cur.execute("SELECT id_departamento FROM departamento WHERE LOWER(nombre_departamento) LIKE LOWER(%s)", (f"%{depto_name}%",))
                res = cur.fetchone()
                if res: depto_id = res[0]
                
        if prov_name:
            cur.execute("SELECT id_provincia, id_departamento FROM provincia WHERE LOWER(nombre_provincia) = LOWER(%s)", (prov_name,))
            res = cur.fetchone()
            if res:
                prov_id = res[0]
                if not depto_id: depto_id = res[1]
            else:
                cur.execute("SELECT id_provincia, id_departamento FROM provincia WHERE LOWER(nombre_provincia) LIKE LOWER(%s)", (f"%{prov_name}%",))
                res = cur.fetchone()
                if res:
                    prov_id = res[0]
                    if not depto_id: depto_id = res[1]
                    
        if dist_name:
            cur.execute("SELECT id_distrito, id_provincia FROM distrito WHERE LOWER(nombre_distrito) = LOWER(%s)", (dist_name,))
            res = cur.fetchone()
            if res:
                dist_id = res[0]
                if not prov_id:
                    prov_id = res[1]
                    cur.execute("SELECT id_departamento FROM provincia WHERE id_provincia = %s", (prov_id,))
                    res_p = cur.fetchone()
                    if res_p: depto_id = res_p[0]
            else:
                cur.execute("SELECT id_distrito, id_provincia FROM distrito WHERE LOWER(nombre_distrito) LIKE LOWER(%s)", (f"%{dist_name}%",))
                res = cur.fetchone()
                if res:
                    dist_id = res[0]
                    if not prov_id:
                        prov_id = res[1]
                        cur.execute("SELECT id_departamento FROM provincia WHERE id_provincia = %s", (prov_id,))
                        res_p = cur.fetchone()
                        if res_p: depto_id = res_p[0]
    except Exception as e:
        print(f"Error mapping geography: {e}")
    finally:
        cur.close()
        conn.close()
    return depto_id, prov_id, dist_id

def extraer_entidades_del_prompt(user_prompt):
    import urllib.request
    import json
    
    prompt_extractor = (
        "Actúa como un extractor de entidades en formato JSON para una base de datos epidemiológica peruana. "
        "Dado el texto del usuario, extrae las entidades mencionadas. "
        "Campos JSON requeridos (usa null si no se mencionan):\n"
        "- departamento: (Nombre de departamento, p. ej. 'Puno', 'Lima', 'Piura')\n"
        "- provincia: (Nombre de provincia)\n"
        "- distrito: (Nombre de distrito)\n"
        "- anio: (Año numérico, p. ej. 2023)\n"
        "- semana: (Semana epidemiológica del 1 al 52)\n"
        "- serotipo: (Serotipo, p. ej. 'DENV-1', 'DENV-2')\n"
        "- clasificacion: (Clasificación del caso, p. ej. 'Grave', 'Con signos de alarma')\n\n"
        f"Texto del usuario: \"{user_prompt}\"\n\n"
        "Responde ÚNICAMENTE con el objeto JSON plano. No incluyas markdown, bloques de código (```json) ni explicaciones adicionales."
    )
    
    url = "https://lb0wyqyxbe.execute-api.us-east-1.amazonaws.com/prod/generate"
    payload = json.dumps({"prompt": prompt_extractor}).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            raw_text = res_json.get('response', '{}').strip()
            
            if raw_text.startswith("```"):
                lines = raw_text.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw_text = "\n".join(lines).strip()
                
    except Exception as e:
        print(f"Error extracting entities: {e}")
        return {}

@pron_bp.route('/asistente-ia', methods=['POST'])
@token_requerido
def asistente_ia():
    import urllib.request
    import json
    
    data = request.get_json() or {}
    tipo = data.get('tipo', 'chat')  # 'chat', 'analisis', 'campana'
    user_prompt = data.get('prompt', '')
    history = data.get('history', [])
    # Limitar el historial a los últimos 30 mensajes (15 turnos completos) para prevenir sobrecarga extrema
    if isinstance(history, list):
        history = history[-30:]
    
    id_departamento = data.get('id_departamento')
    id_provincia = data.get('id_provincia')
    id_distrito = data.get('id_distrito')
    anio = data.get('anio')
    semana = data.get('semana')
    id_serotipo = data.get('id_serotipo')
    id_clasificacion = data.get('id_clasificacion')

    # Helper function to call the LLM endpoint with automatic retries and exponential backoff
    def llamar_endpoint_llm(prompt_text, timeout=30, max_retries=3):
        import urllib.request
        import urllib.error
        import json
        import time
        import sys
        
        url = "https://lb0wyqyxbe.execute-api.us-east-1.amazonaws.com/prod/generate"
        payload = json.dumps({"prompt": prompt_text}).encode('utf-8')
        
        for attempt in range(1, max_retries + 1):
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            try:
                print(f"[LLM CALL] Intentando llamada a la API (Intento {attempt}/{max_retries})...")
                sys.stdout.flush()
                with urllib.request.urlopen(req, timeout=timeout) as response:
                    res_body = response.read().decode('utf-8')
                    res_json = json.loads(res_body)
                    response_text = res_json.get('response', '').strip()
                    if response_text:
                        print(f"[LLM CALL] Éxito en intento {attempt}.")
                        sys.stdout.flush()
                        return response_text
                    else:
                        print(f"[LLM CALL] Intento {attempt} retornó una respuesta vacía.")
                        sys.stdout.flush()
            except urllib.error.HTTPError as e:
                print(f"[LLM CALL] Error HTTP en intento {attempt}: {e.code} - {e.reason}")
                sys.stdout.flush()
            except urllib.error.URLError as e:
                print(f"[LLM CALL] Error de red/timeout en intento {attempt}: {e.reason}")
                sys.stdout.flush()
            except Exception as e:
                print(f"[LLM CALL] Error inesperado en intento {attempt}: {e}")
                sys.stdout.flush()
            
            # Exponential backoff (1.5s, 3.0s, 6.0s...)
            if attempt < max_retries:
                sleep_time = 1.5 * (2 ** (attempt - 1))
                print(f"[LLM CALL] Reintentando en {sleep_time} segundos...")
                sys.stdout.flush()
                time.sleep(sleep_time)
                
        print("[LLM CALL] Se agotaron todos los intentos de llamada a la IA.")
        sys.stdout.flush()
        return ""

    # 1. Procesar Chat con Contexto e Inteligencia SQL (si es tipo 'chat')
    if tipo == 'chat':
        # Comprobar si es la solicitud de reporte automático del dashboard
        is_dashboard_report = "Como epidemiólogo experto" in user_prompt or "Pregunta médica/epidemiológica del usuario sobre la distribución" in user_prompt
        
        if not is_dashboard_report:
            # Construir filtros activos como contexto para el planificador SQL
            filters_list = []
            if id_departamento:
                deptos = repo_geo.listar_departamentos()
                d_obj = next((d for d in deptos if d.id_departamento == id_departamento), None)
                if d_obj: filters_list.append(f"departamento = '{d_obj.nombre_departamento}'")
            if id_provincia:
                provs = repo_geo.listar_provincias(id_departamento)
                p_obj = next((p for p in provs if p.id_provincia == id_provincia), None)
                if p_obj: filters_list.append(f"provincia = '{p_obj.nombre_provincia}'")
            if id_distrito:
                dists = repo_geo.listar_distritos(id_provincia)
                di_obj = next((d for d in dists if d.id_distrito == id_distrito), None)
                if di_obj: filters_list.append(f"distrito = '{di_obj.nombre_distrito}'")
            if anio:
                filters_list.append(f"año = {anio}")
            if semana:
                filters_list.append(f"semana = {semana}")
            if id_serotipo:
                ser_cat = repo_geo.listar_serotipos()
                s_obj = next((s for s in ser_cat if s.id_serotipo == id_serotipo), None)
                if s_obj: filters_list.append(f"serotipo = '{s_obj.codigo}'")
            if id_clasificacion:
                clas_cat = repo_geo.listar_clasificaciones()
                c_obj = next((c for c in clas_cat if c.id_clasificacion == id_clasificacion), None)
                if c_obj: filters_list.append(f"clasificación = '{c_obj.nombre}'")

            active_filters_hint = ""
            if filters_list:
                active_filters_hint = "\nFiltros de búsqueda epidemiológica activos en la interfaz (aplícalos a la consulta SQL si el usuario pide estadísticas):\n" + "\n".join([f"- {f}" for f in filters_list])

            # Prompt para decidir si se necesita SQL y generarlo
            planning_prompt = (
                "Eres un agente inteligente para SIVED-Perú, un sistema de vigilancia de dengue en Perú. "
                "Tu tarea es decidir si la pregunta del usuario requiere consultar la base de datos PostgreSQL de SIVED-Perú para obtener números, conteos, listados o estadísticas epidemiológicas.\n\n"
                "Esquema de base de datos:\n"
                "- departamento: id_departamento (PK), nombre_departamento (VARCHAR)\n"
                "- provincia: id_provincia (PK), nombre_provincia (VARCHAR), id_departamento (FK)\n"
                "- distrito: id_distrito (PK), nombre_distrito (VARCHAR), id_provincia (FK)\n"
                "- establecimiento_salud: id_establecimiento (PK), nombre_establecimiento (VARCHAR), categoria (VARCHAR), id_distrito (FK)\n"
                "- paciente: id_paciente (PK), documento (VARCHAR), nombres (VARCHAR), apellidos (VARCHAR), fecha_nacimiento (DATE), sexo (CHAR: 'M' o 'F'), id_distrito (FK)\n"
                "- periodo_epidemiologico: id_periodo (PK), anio (INT), numero_semana (INT), fecha_inicio (DATE), fecha_fin (DATE)\n"
                "- serotipo: id_serotipo (PK), codigo (VARCHAR, p.ej. 'DENV-1', 'DENV-2', 'DENV-3', 'DENV-4'), descripcion (VARCHAR)\n"
                "- clasificacion_caso: id_clasificacion (PK), nombre (VARCHAR), descripcion (VARCHAR)\n"
                "- caso_dengue: id_caso (PK), id_paciente (FK), id_establecimiento (FK), id_periodo (FK), id_serotipo (FK), id_clasificacion (FK), fecha_notificacion (DATE), tipo_diagnostico (VARCHAR: 'Probable' o 'Confirmado'), condicion (VARCHAR: 'Vivo' o 'Fallecido')\n\n"
                "Reglas importantes:\n"
                "1. Genera únicamente una consulta SELECT válida para PostgreSQL. No uses comandos modificadores (INSERT, UPDATE, DELETE).\n"
                "2. Para contar casos totales usa: SELECT COUNT(*) FROM caso_dengue\n"
                "3. Para contar fallecidos usa: SELECT COUNT(*) FROM caso_dengue WHERE condicion = 'Fallecido'\n"
                "4. Para unir geografía usa: caso_dengue JOIN establecimiento_salud USING(id_establecimiento) JOIN distrito USING(id_distrito) JOIN provincia USING(id_provincia) JOIN departamento USING(id_departamento)\n"
                "5. Para filtrar por año o semana, une con periodo_epidemiologico usando: caso_dengue JOIN periodo_epidemiologico USING(id_periodo)\n"
                "6. Para unir paciente usa: caso_dengue JOIN paciente USING(id_paciente)\n"
                "7. Filtra de forma flexible usando ILIKE (p.ej. nombre_departamento ILIKE '%piura%').\n"
                "8. Limita los resultados agregando LIMIT 15 al final para no saturar.\n"
                "9. Responde estrictamente con la consulta SQL en una sola línea. No incluyas explicaciones ni bloques de código (```).\n"
                "10. Si la pregunta del usuario es conceptual (ej. qué es el dengue, síntomas comunes, recomendaciones, prevención) o un saludo, responde estrictamente: NO_BD\n"
                "11. Si el usuario pregunta por regiones o áreas geográficas de Perú (norte, centro, sur, oriente), traduce esta indicación a una cláusula IN con los nombres oficiales de los departamentos correspondientes (en mayúsculas):\n"
                "    - sur: UPPER(nombre_departamento) IN ('AREQUIPA', 'CUSCO', 'TACNA', 'MOQUEGUA', 'PUNO', 'APURIMAC', 'AYACUCHO', 'HUANCAVELICA', 'MADRE DE DIOS')\n"
                "    - norte: UPPER(nombre_departamento) IN ('TUMBES', 'PIURA', 'LAMBAYEQUE', 'LA LIBERTAD', 'CAJAMARCA', 'AMAZONAS', 'SAN MARTIN', 'LORETO')\n"
                "    - centro: UPPER(nombre_departamento) IN ('LIMA', 'CALLAO', 'ANCASH', 'HUANUCO', 'PASCO', 'JUNIN', 'ICA', 'UCAYALI')\n"
                "    - oriente: UPPER(nombre_departamento) IN ('LORETO', 'UCAYALI', 'MADRE DE DIOS', 'SAN MARTIN', 'AMAZONAS')\n\n"
                f"Pregunta del usuario: \"{user_prompt}\""
                f"{active_filters_hint}\n\n"
                "Respuesta (SQL o NO_BD):"
            )

            sql_query = llamar_endpoint_llm(planning_prompt, timeout=25)
            db_results = None
            exec_error = None

            # Limpiar posibles delimitadores markdown del SQL
            if sql_query:
                sql_query = sql_query.replace("```sql", "").replace("```", "").strip()

            if sql_query and sql_query.upper().startswith("SELECT"):
                print(f"[SQL AGENT] Generado: {sql_query}")
                import sys
                sys.stdout.flush()
                conn = DatabaseConnection.get_connection()
                cur = conn.cursor(cursor_factory=RealDictCursor)
                try:
                    cur.execute(sql_query)
                    db_results = cur.fetchall()
                    print(f"[SQL AGENT] Filas devueltas: {len(db_results)}")
                    sys.stdout.flush()
                except Exception as e:
                    exec_error = str(e)
                    print(f"[SQL AGENT] Error ejecutando consulta del planificador SQL: {e}")
                    import sys
                    sys.stdout.flush()
                finally:
                    cur.close()
                    conn.close()

            # Formatear el historial de chat para mantener el contexto
            history_str = ""
            for msg in history:
                role_label = "Usuario" if msg.get('role') == 'user' else "Asistente"
                history_str += f"{role_label}: {msg.get('content')}\n\n"

            # Custom JSON Encoder to handle date/datetime objects in database results
            class DateEncoder(json.JSONEncoder):
                def default(self, obj):
                    import datetime
                    if isinstance(obj, (datetime.date, datetime.datetime)):
                        return obj.isoformat()
                    return super().default(obj)

            # Construir el prompt final
            if db_results is not None:
                db_results_str = json.dumps(db_results, cls=DateEncoder, ensure_ascii=False, indent=2)
                prompt_final = (
                    f"Eres el Asistente Clínico de IA de SIVED-Perú. Tienes acceso directo a la base de datos PostgreSQL del sistema.\n"
                    f"Para responder la consulta del usuario, has ejecutado con éxito esta consulta SQL:\n"
                    f"{sql_query}\n\n"
                    f"Resultados de la base de datos:\n{db_results_str}\n\n"
                    f"Instrucciones:\n"
                    f"- Responde a la pregunta de forma clara, profesional y empática en base a estos datos.\n"
                    f"- Utiliza siempre tablas y listados en markdown si te solicitan rankings, conteos o desgloses.\n"
                    f"- Si no hay resultados, indícalo de forma amable.\n\n"
                    f"Historial de conversación:\n{history_str}"
                    f"Usuario: {user_prompt}\n\n"
                    f"Asistente:"
                )
            elif exec_error is not None:
                prompt_final = (
                    f"Eres el Asistente Clínico de IA de SIVED-Perú.\n"
                    f"El usuario solicitó información de la base de datos, pero ocurrió un error al procesar la consulta:\n"
                    f"Error: {exec_error}\n\n"
                    f"Por favor, indícale al usuario de forma atenta que ocurrió un problema al consultar la base de datos y ofrécele responder de forma conceptual o indícale qué filtros podrían estar causando el conflicto.\n\n"
                    f"Historial de conversación:\n{history_str}"
                    f"Usuario: {user_prompt}\n\n"
                    f"Asistente:"
                )
            else:
                prompt_final = (
                    f"Eres el Asistente Clínico de IA de SIVED-Perú, un chatbot de soporte epidemiológico y prevención del dengue en el Perú.\n"
                    f"Responde de forma clara, profesional y concisa a la consulta del usuario.\n"
                    f"Puedes utilizar formato de markdown (como negritas, listas o tablas) para estructurar tu respuesta de forma amigable.\n\n"
                    f"Historial de conversación:\n{history_str}"
                    f"Usuario: {user_prompt}\n\n"
                    f"Asistente:"
                )

            # Ejecutar llamada final
            respuesta_final = llamar_endpoint_llm(prompt_final, timeout=35)
            return jsonify({
                'success': True,
                'respuesta': respuesta_final or "Lo siento, no pude generar una respuesta en este momento.",
                'modelo': 'Amazon Nova Pro'
            })

    # Procesamiento por NLP si es un chat libre original o dashboard
    if tipo == 'chat':
        entidades = extraer_entidades_del_prompt(user_prompt)
        if entidades:
            dept_name = entidades.get('departamento')
            prov_name = entidades.get('provincia')
            dist_name = entidades.get('distrito')
            
            e_depto, e_prov, e_dist = map_names_to_ids(dept_name, prov_name, dist_name)
            
            # Si se mapeó geografía o se especificó fecha
            if e_depto or e_prov or e_dist or entidades.get('anio') or entidades.get('semana'):
                tipo = 'analisis'
                id_departamento = e_depto or id_departamento
                id_provincia = e_prov or id_provincia
                id_distrito = e_dist or id_distrito
                anio = entidades.get('anio') or anio
                semana = entidades.get('semana') or semana
                
                # Mapear serotipo
                ser_code = entidades.get('serotipo')
                if ser_code:
                    ser_cat = repo_geo.listar_serotipos()
                    ser_obj = next((s for s in ser_cat if ser_code.lower() in s.codigo.lower() or ser_code.lower() in s.descripcion.lower()), None)
                    if ser_obj: id_serotipo = ser_obj.id_serotipo
                    
                # Mapear clasificación
                clas_name = entidades.get('clasificacion')
                if clas_name:
                    clas_cat = repo_geo.listar_clasificaciones()
                    clas_obj = next((c for c in clas_cat if clas_name.lower() in c.nombre.lower() or clas_name.lower() in c.descripcion.lower()), None)
                    if clas_obj: id_clasificacion = clas_obj.id_clasificacion

    # 2. Enriquecer prompt según el tipo (Original fallback/dashboard)
    prompt_final = ""
    
    if tipo == 'analisis':
        ambito_str = "Nacional"
        filtros_desc = []
        if id_departamento:
            deptos = repo_geo.listar_departamentos()
            depto_obj = next((d for d in deptos if d.id_departamento == id_departamento), None)
            if depto_obj: ambito_str = f"Depto {depto_obj.nombre_departamento}"
                
        if id_provincia:
            provs = repo_geo.listar_provincias(id_departamento)
            prov_obj = next((p for p in provs if p.id_provincia == id_provincia), None)
            if prov_obj: ambito_str += f" -> Prov {prov_obj.nombre_provincia}"
                
        if id_distrito:
            dists = repo_geo.listar_distritos(id_provincia)
            dist_obj = next((d for d in dists if d.id_distrito == id_distrito), None)
            if dist_obj: ambito_str += f" -> Dist {dist_obj.nombre_distrito}"
                
        if anio: filtros_desc.append(f"Año {anio}")
        if semana: filtros_desc.append(f"Semana {semana}")
        if id_serotipo:
            ser_cat = repo_geo.listar_serotipos()
            ser_name = next((s.codigo for s in ser_cat if s.id_serotipo == id_serotipo), id_serotipo)
            filtros_desc.append(f"Serotipo {ser_name}")
        if id_clasificacion:
            clas_cat = repo_geo.listar_clasificaciones()
            clas_name = next((c.nombre for c in clas_cat if c.id_clasificacion == id_clasificacion), id_clasificacion)
            filtros_desc.append(f"Clasificación {clas_name}")
            
        filtros_str = ", ".join(filtros_desc) if filtros_desc else "Sin filtros temporales"

        indicadores = RepositorioEstadistica.obtener_resumen_indicadores_filtrado(
            depto_id=id_departamento,
            prov_id=id_provincia,
            dist_id=id_distrito,
            anio=anio,
            semana=semana,
            serotipo_id=id_serotipo,
            clasificacion_id=id_clasificacion
        )
        
        serotipos_data = RepositorioEstadistica.obtener_distribucion_serotipos(id_departamento)
        serotipos_str = ", ".join([f"{s['serotipo']} ({s['casos']} casos)" for s in serotipos_data]) if serotipos_data else "Ninguno reportado"
        
        sintomas_data = RepositorioEstadistica.obtener_distribucion_sintomas(id_departamento)
        sintomas_str = ", ".join([f"{s['sintoma']} ({s['casos']} casos)" for s in sintomas_data[:5]]) if sintomas_data else "Ninguno reportado"
        
        prompt_final = (
            f"Actúa como un médico epidemiólogo experto en salud pública en el Perú. "
            f"Analiza la situación del dengue en: '{ambito_str}' ({filtros_str}) "
            f"con base en estos indicadores de SIVED-Perú:\n"
            f"- Casos registrados: {indicadores.get('total_casos', 0)} (Confirmados: {indicadores.get('total_confirmados', 0)})\n"
            f"- Fallecidos: {indicadores.get('total_fallecidos', 0)} (Tasa Letalidad: {indicadores.get('letalidad_pct', 0.0)}%)\n"
            f"- Tasa Incidencia: {indicadores.get('incidencia_por_100k', 0.0)}/100k hab.\n"
            f"- Serotipos: {serotipos_str}\n"
            f"- Síntomas: {sintomas_str}\n\n"
            f"Consulta: \"{user_prompt}\"\n\n"
            f"Instrucción: Proporciona un reporte en español de MÁXIMO 110 PALABRAS. "
            f"DEBES presentar obligatoriamente las cifras clave (Casos totales, Confirmados, Fallecidos, Letalidad, Incidencia) estructuradas en un CUADRO/TABLA markdown (columnas: Indicador y Valor). "
            f"Luego escribe un párrafo corto de conclusión."
        )
    elif tipo == 'campana':
        nombre_depto = "el país"
        if id_departamento:
            deptos = repo_geo.listar_departamentos()
            depto_obj = next((d for d in deptos if d.id_departamento == id_departamento), None)
            if depto_obj: nombre_depto = f"el departamento de {depto_obj.nombre_departamento}"
        
        prompt_final = (
            f"Actúa como especialista en comunicación social en salud en Perú. "
            f"Crea un eslogan y un mensaje clave de prevención del dengue para {nombre_depto}. "
            f"Enfoque: \"{user_prompt}\".\n\n"
            f"Responde en español de forma extremadamente concisa (MÁXIMO 60 PALABRAS)."
        )
    else:
        prompt_final = (
            f"Eres el Asistente de IA de SIVED-Perú. "
            f"Responde de forma extremadamente concisa y directa (MÁXIMO 50 PALABRAS) en español a: \"{user_prompt}\""
        )
        
    url = "https://lb0wyqyxbe.execute-api.us-east-1.amazonaws.com/prod/generate"
    payload = json.dumps({"prompt": prompt_final}).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            res_json = json.loads(response.read().decode('utf-8'))
            return jsonify({
                'success': res_json.get('success', False),
                'respuesta': res_json.get('response', ''),
                'modelo': res_json.get('model', 'Amazon Nova Pro')
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'mensaje': 'Error de comunicación con el servicio de IA externo',
            'error': str(e)
        }), 500


# ---------- 6. Controladores de Administración de Usuarios ----------

@usr_bp.route('', methods=['GET'])
@token_requerido
@requiere_roles('Administrador')
def get_usuarios():
    usuarios = repo_usr.listar()
    roles = repo_usr.listar_roles()
    rol_map = {r.id_rol: r.nombre_rol for r in roles}
    
    res = []
    for u in usuarios:
        res.append({
            'id_usuario': u.id_usuario,
            'nombre_usuario': u.nombre_usuario,
            'correo': u.correo,
            'id_rol': u.id_rol,
            'rol': rol_map.get(u.id_rol, 'Desconocido'),
            'activo': u.activo,
            'id_profesional': u.id_profesional
        })
    return jsonify(res)

@usr_bp.route('', methods=['POST'])
@token_requerido
@requiere_roles('Administrador')
def crear_usuario():
    data = request.get_json()
    username = data.get('nombre_usuario')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'mensaje': 'Usuario y contraseña son requeridos'}), 400
        
    if repo_usr.buscar_por_nombre(username):
        return jsonify({'mensaje': 'El nombre de usuario ya está registrado'}), 400
        
    hash_pass = Hasher.hashear_password(password)
    
    usuario = Usuario(
        id_usuario=None,
        nombre_usuario=username,
        hash_contrasena=hash_pass,
        correo=data.get('correo'),
        id_rol=data.get('id_rol'),
        id_profesional=data.get('id_profesional') if data.get('id_profesional') != "" else None,
        activo=data.get('activo', True)
    )
    
    repo_usr.guardar(usuario)
    return jsonify({'mensaje': 'Usuario creado con éxito', 'id_usuario': usuario.id_usuario}), 201

@usr_bp.route('/<int:id_usuario>', methods=['PUT'])
@token_requerido
@requiere_roles('Administrador')
def editar_usuario(id_usuario):
    usuario = repo_usr.buscar_por_id(id_usuario)
    if not usuario:
        return jsonify({'mensaje': 'Usuario no encontrado'}), 404
        
    data = request.get_json()
    username = data.get('nombre_usuario')
    
    # Comprobar si el nombre de usuario ya existe en otro id
    usr_existente = repo_usr.buscar_por_nombre(username)
    if usr_existente and usr_existente.id_usuario != id_usuario:
        return jsonify({'mensaje': 'El nombre de usuario ya está registrado por otra cuenta'}), 400
        
    usuario.nombre_usuario = username
    usuario.correo = data.get('correo', usuario.correo)
    usuario.id_rol = data.get('id_rol', usuario.id_rol)
    usuario.id_profesional = data.get('id_profesional') if data.get('id_profesional') != "" else None
    usuario.activo = data.get('activo', usuario.activo)
    
    # Si se envía una nueva contraseña, re-hashear
    new_password = data.get('password')
    if new_password:
        usuario.hash_contrasena = Hasher.hashear_password(new_password)
        
    repo_usr.guardar(usuario)
    return jsonify({'mensaje': 'Usuario actualizado con éxito'})

@usr_bp.route('/<int:id_usuario>', methods=['DELETE'])
@token_requerido
@requiere_roles('Administrador')
def eliminar_usuario(id_usuario):
    success = repo_usr.eliminar(id_usuario)
    if success:
        return jsonify({'mensaje': 'Usuario eliminado con éxito'})
    return jsonify({'mensaje': 'Error al eliminar usuario'}), 500
