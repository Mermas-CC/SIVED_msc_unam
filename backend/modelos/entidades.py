from datetime import datetime

class Rol:
    def __init__(self, id_rol, nombre_rol, permisos=None, descripcion=None):
        self.id_rol = id_rol
        self.nombre_rol = nombre_rol
        self.permisos = permisos or ""  # comma-separated string of permissions
        self.descripcion = descripcion


class Usuario:
    def __init__(self, id_usuario, nombre_usuario, hash_contrasena, correo, id_rol, id_profesional=None, activo=True):
        self.id_usuario = id_usuario
        self.nombre_usuario = nombre_usuario
        self.hash_contrasena = hash_contrasena
        self.correo = correo
        self.id_rol = id_rol
        self.id_profesional = id_profesional
        self.activo = activo


class Departamento:
    def __init__(self, id_departamento, nombre_departamento, latitud=None, longitud=None, area_km2=None):
        self.id_departamento = id_departamento
        self.nombre_departamento = nombre_departamento
        self.latitud = latitud
        self.longitud = longitud
        self.area_km2 = area_km2


class Provincia:
    def __init__(self, id_provincia, nombre_provincia, id_departamento, latitud=None, longitud=None):
        self.id_provincia = id_provincia
        self.nombre_provincia = nombre_provincia
        self.id_departamento = id_departamento
        self.latitud = latitud
        self.longitud = longitud


class Distrito:
    def __init__(self, id_distrito, nombre_distrito, id_provincia, latitud=None, longitud=None):
        self.id_distrito = id_distrito
        self.nombre_distrito = nombre_distrito
        self.id_provincia = id_provincia
        self.latitud = latitud
        self.longitud = longitud


class EstablecimientoSalud:
    def __init__(self, id_establecimiento, nombre_establecimiento, categoria, id_distrito):
        self.id_establecimiento = id_establecimiento
        self.nombre_establecimiento = nombre_establecimiento
        self.categoria = categoria
        self.id_distrito = id_distrito


class Serotipo:
    def __init__(self, id_serotipo, codigo, descripcion=None):
        self.id_serotipo = id_serotipo
        self.codigo = codigo
        self.descripcion = descripcion


class ClasificacionCaso:
    def __init__(self, id_clasificacion, nombre, descripcion=None):
        self.id_clasificacion = id_clasificacion
        self.nombre = nombre
        self.descripcion = descripcion


class SignoSintoma:
    def __init__(self, id_sintoma, nombre):
        self.id_sintoma = id_sintoma
        self.nombre = nombre


class PeriodoEpidemiologico:
    def __init__(self, id_periodo, anio, numero_semana, fecha_inicio, fecha_fin):
        self.id_periodo = id_periodo
        self.anio = anio
        self.numero_semana = numero_semana
        self.fecha_inicio = fecha_inicio
        self.fecha_fin = fecha_fin


class DiagnosticoLaboratorio:
    def __init__(self, id_diagnostico, id_caso, tipo_prueba, resultado, fecha_resultado=None):
        self.id_diagnostico = id_diagnostico
        self.id_caso = id_caso
        self.tipo_prueba = tipo_prueba  # NS1, IgM, RT-PCR
        self.resultado = resultado      # Positivo, Negativo
        self.fecha_resultado = fecha_resultado


class MedidaClimatica:
    def __init__(self, id_medida, id_departamento, id_periodo, temp_media_c=None, temp_max_c=None, precip_total_mm=None):
        self.id_medida = id_medida
        self.id_departamento = id_departamento
        self.id_periodo = id_periodo
        self.temp_media_c = temp_media_c
        self.temp_max_c = temp_max_c
        self.precip_total_mm = precip_total_mm


class PrediccionAlerta:
    def __init__(self, id_prediccion, id_departamento, id_periodo, casos_observados=None, casos_predichos=None, casos_esperados=None, nivel_alerta=None, modelo=None, mae=None, generado_en=None):
        self.id_prediccion = id_prediccion
        self.id_departamento = id_departamento
        self.id_periodo = id_periodo
        self.casos_observados = casos_observados
        self.casos_predichos = casos_predichos
        self.casos_esperados = casos_esperados
        self.nivel_alerta = nivel_alerta
        self.modelo = modelo
        self.mae = mae
        self.generado_en = generado_en or datetime.now()


class CasoDengue:
    def __init__(self, id_caso, id_paciente, id_establecimiento, id_profesional, id_periodo, id_serotipo, id_clasificacion, fecha_notificacion, fecha_inicio_sintomas=None, tipo_diagnostico=None, condicion=None, sintomas=None, diagnosticos_lab=None):
        self.id_caso = id_caso
        self.id_paciente = id_paciente
        self.id_establecimiento = id_establecimiento
        self.id_profesional = id_profesional
        self.id_periodo = id_periodo
        self.id_serotipo = id_serotipo
        self.id_clasificacion = id_clasificacion
        self.fecha_notificacion = fecha_notificacion
        self.fecha_inicio_sintomas = fecha_inicio_sintomas
        self.tipo_diagnostico = tipo_diagnostico # Probable, Confirmado
        self.condicion = condicion               # Vivo, Fallecido
        
        # Atributos de composición y agregación (UML)
        self.sintomas = sintomas or []                   # Lista de objetos SignoSintoma
        self.diagnosticos_lab = diagnosticos_lab or []   # Lista de objetos DiagnosticoLaboratorio

    def es_grave(self):
        # 3 es la clasificación para 'Dengue grave'
        return self.id_clasificacion == 3

    def agregar_diagnostico(self, diagnostico):
        self.diagnosticos_lab.append(diagnostico)

    def agregar_sintoma(self, sintoma):
        if sintoma not in self.sintomas:
            self.sintomas.append(sintoma)
