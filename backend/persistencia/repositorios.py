import psycopg2
from psycopg2.extras import RealDictCursor
from backend.config import Config
from backend.persistencia.base_repository import RepositorioBase
from backend.modelos.persona import Paciente, ProfesionalSalud
from backend.modelos.entidades import (
    CasoDengue, Usuario, Rol, Departamento, Provincia, Distrito,
    EstablecimientoSalud, Serotipo, ClasificacionCaso, SignoSintoma,
    DiagnosticoLaboratorio, MedidaClimatica, PrediccionAlerta, PeriodoEpidemiologico
)

class DatabaseConnection:
    @staticmethod
    def get_connection():
        return psycopg2.connect(Config.DATABASE_URI)

class RepositorioUsuario(RepositorioBase):
    def guardar(self, usuario: Usuario):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            # Comprobar si ya existe
            cur.execute("SELECT 1 FROM usuario WHERE id_usuario = %s", (usuario.id_usuario,))
            exists = cur.fetchone()
            if exists:
                cur.execute(
                    """
                    UPDATE usuario 
                    SET nombre_usuario = %s, hash_contrasena = %s, correo = %s, id_rol = %s, id_profesional = %s, activo = %s 
                    WHERE id_usuario = %s
                    """,
                    (usuario.nombre_usuario, usuario.hash_contrasena, usuario.correo, usuario.id_rol, usuario.id_profesional, usuario.activo, usuario.id_usuario)
                )
            else:
                # Si el id es None, autogenerar id
                if usuario.id_usuario is None:
                    cur.execute("SELECT COALESCE(MAX(id_usuario), 0) + 1 FROM usuario")
                    usuario.id_usuario = cur.fetchone()[0]
                cur.execute(
                    """
                    INSERT INTO usuario (id_usuario, nombre_usuario, hash_contrasena, correo, id_rol, id_profesional, activo)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (usuario.id_usuario, usuario.nombre_usuario, usuario.hash_contrasena, usuario.correo, usuario.id_rol, usuario.id_profesional, usuario.activo)
                )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def buscar_por_id(self, id_usuario):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM usuario WHERE id_usuario = %s", (id_usuario,))
            row = cur.fetchone()
            if row:
                return Usuario(
                    id_usuario=row['id_usuario'],
                    nombre_usuario=row['nombre_usuario'],
                    hash_contrasena=row['hash_contrasena'],
                    correo=row['correo'],
                    id_rol=row['id_rol'],
                    id_profesional=row['id_profesional'],
                    activo=row['activo']
                )
            return None
        finally:
            cur.close()
            conn.close()

    def buscar_por_nombre(self, nombre_usuario):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM usuario WHERE nombre_usuario = %s", (nombre_usuario,))
            row = cur.fetchone()
            if row:
                return Usuario(
                    id_usuario=row['id_usuario'],
                    nombre_usuario=row['nombre_usuario'],
                    hash_contrasena=row['hash_contrasena'],
                    correo=row['correo'],
                    id_rol=row['id_rol'],
                    id_profesional=row['id_profesional'],
                    activo=row['activo']
                )
            return None
        finally:
            cur.close()
            conn.close()

    def buscar_rol_por_id(self, id_rol):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM rol WHERE id_rol = %s", (id_rol,))
            row = cur.fetchone()
            if row:
                return Rol(
                    id_rol=row['id_rol'],
                    nombre_rol=row['nombre_rol'],
                    permisos=row['permisos'],
                    descripcion=row['descripcion']
                )
            return None
        finally:
            cur.close()
            conn.close()

    def listar(self):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM usuario ORDER BY id_usuario")
            rows = cur.fetchall()
            return [
                Usuario(
                    id_usuario=r['id_usuario'],
                    nombre_usuario=r['nombre_usuario'],
                    hash_contrasena=r['hash_contrasena'],
                    correo=r['correo'],
                    id_rol=r['id_rol'],
                    id_profesional=r['id_profesional'],
                    activo=r['activo']
                )
                for r in rows
            ]
        finally:
            cur.close()
            conn.close()

    def listar_roles(self):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM rol ORDER BY id_rol")
            rows = cur.fetchall()
            return [
                Rol(
                    id_rol=r['id_rol'],
                    nombre_rol=r['nombre_rol'],
                    permisos=r['permisos'],
                    descripcion=r['descripcion']
                )
                for r in rows
            ]
        finally:
            cur.close()
            conn.close()

    def eliminar(self, id_usuario):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM usuario WHERE id_usuario = %s", (id_usuario,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()


class RepositorioCaso(RepositorioBase):
    def guardar(self, caso: CasoDengue):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            # Comprobar si ya existe
            cur.execute("SELECT 1 FROM caso_dengue WHERE id_caso = %s", (caso.id_caso,))
            exists = cur.fetchone()
            if exists:
                # Actualizar caso
                cur.execute(
                    """
                    UPDATE caso_dengue 
                    SET id_paciente = %s, id_establecimiento = %s, id_profesional = %s, id_periodo = %s, 
                        id_serotipo = %s, id_clasificacion = %s, fecha_notificacion = %s, fecha_inicio_sintomas = %s, 
                        tipo_diagnostico = %s, condicion = %s
                    WHERE id_caso = %s
                    """,
                    (caso.id_paciente, caso.id_establecimiento, caso.id_profesional, caso.id_periodo,
                     caso.id_serotipo, caso.id_clasificacion, caso.fecha_notificacion, caso.fecha_inicio_sintomas,
                     caso.tipo_diagnostico, caso.condicion, caso.id_caso)
                )
            else:
                # Si el id es None, autogenerar id
                if caso.id_caso is None:
                    cur.execute("SELECT COALESCE(MAX(id_caso), 0) + 1 FROM caso_dengue")
                    caso.id_caso = cur.fetchone()[0]
                cur.execute(
                    """
                    INSERT INTO caso_dengue (id_caso, id_paciente, id_establecimiento, id_profesional, id_periodo, 
                                            id_serotipo, id_clasificacion, fecha_notificacion, fecha_inicio_sintomas, 
                                            tipo_diagnostico, condicion)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (caso.id_caso, caso.id_paciente, caso.id_establecimiento, caso.id_profesional, caso.id_periodo,
                     caso.id_serotipo, caso.id_clasificacion, caso.fecha_notificacion, caso.fecha_inicio_sintomas,
                     caso.tipo_diagnostico, caso.condicion)
                )

            # Actualizar síntomas (N:M caso_signo)
            # Primero borramos los existentes para este caso
            cur.execute("DELETE FROM caso_signo WHERE id_caso = %s", (caso.id_caso,))
            # Insertamos los nuevos
            for sintoma in caso.sintomas:
                cur.execute(
                    "INSERT INTO caso_signo (id_caso, id_sintoma) VALUES (%s, %s)",
                    (caso.id_caso, sintoma.id_sintoma)
                )

            # Guardar diagnósticos de laboratorio asociados (composición)
            # Borrar existentes de laboratorio y guardar nuevos
            cur.execute("DELETE FROM diagnostico_laboratorio WHERE id_caso = %s", (caso.id_caso,))
            for diag in caso.diagnosticos_lab:
                # Autogenerar ID de diagnóstico de laboratorio si es necesario
                cur.execute("SELECT COALESCE(MAX(id_diagnostico), 0) + 1 FROM diagnostico_laboratorio")
                diag.id_diagnostico = cur.fetchone()[0]
                cur.execute(
                    """
                    INSERT INTO diagnostico_laboratorio (id_diagnostico, id_caso, tipo_prueba, resultado, fecha_resultado)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (diag.id_diagnostico, caso.id_caso, diag.tipo_prueba, diag.resultado, diag.fecha_resultado)
                )

            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def buscar_por_id(self, id_caso):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Buscar el caso central
            cur.execute("SELECT * FROM caso_dengue WHERE id_caso = %s", (id_caso,))
            row = cur.fetchone()
            if not row:
                return None

            # Buscar síntomas del caso
            cur.execute(
                """
                SELECT ss.* FROM signo_sintoma ss
                JOIN caso_signo cs ON ss.id_sintoma = cs.id_sintoma
                WHERE cs.id_caso = %s
                """,
                (id_caso,)
            )
            sintomas_rows = cur.fetchall()
            sintomas = [SignoSintoma(r['id_sintoma'], r['nombre']) for r in sintomas_rows]

            # Buscar diagnósticos de laboratorio del caso
            cur.execute("SELECT * FROM diagnostico_laboratorio WHERE id_caso = %s", (id_caso,))
            lab_rows = cur.fetchall()
            diagnosticos = [
                DiagnosticoLaboratorio(
                    id_diagnostico=r['id_diagnostico'],
                    id_caso=r['id_caso'],
                    tipo_prueba=r['tipo_prueba'],
                    resultado=r['resultado'],
                    fecha_resultado=r['fecha_resultado']
                )
                for r in lab_rows
            ]

            return CasoDengue(
                id_caso=row['id_caso'],
                id_paciente=row['id_paciente'],
                id_establecimiento=row['id_establecimiento'],
                id_profesional=row['id_profesional'],
                id_periodo=row['id_periodo'],
                id_serotipo=row['id_serotipo'],
                id_clasificacion=row['id_clasificacion'],
                fecha_notificacion=row['fecha_notificacion'],
                fecha_inicio_sintomas=row['fecha_inicio_sintomas'],
                tipo_diagnostico=row['tipo_diagnostico'],
                condicion=row['condicion'],
                sintomas=sintomas,
                diagnosticos_lab=diagnosticos
            )
        finally:
            cur.close()
            conn.close()

    def listar(self):
        # Listado básico de casos sin síntomas cargados recursivamente (para optimizar)
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM caso_dengue ORDER BY id_caso DESC LIMIT 200") # Limitar para rendimiento de la API
            rows = cur.fetchall()
            return [
                CasoDengue(
                    id_caso=r['id_caso'],
                    id_paciente=r['id_paciente'],
                    id_establecimiento=r['id_establecimiento'],
                    id_profesional=r['id_profesional'],
                    id_periodo=r['id_periodo'],
                    id_serotipo=r['id_serotipo'],
                    id_clasificacion=r['id_clasificacion'],
                    fecha_notificacion=r['fecha_notificacion'],
                    fecha_inicio_sintomas=r['fecha_inicio_sintomas'],
                    tipo_diagnostico=r['tipo_diagnostico'],
                    condicion=r['condicion']
                )
                for r in rows
            ]
        finally:
            cur.close()
            conn.close()

    def buscar_filtrado(self, depto_id=None, prov_id=None, dist_id=None, anio=None, semana=None, serotipo_id=None, clasificacion_id=None):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            query = """
                SELECT c.*, p.documento, p.nombres AS pac_nombres, p.apellidos AS pac_apellidos,
                       e.nombre_establecimiento, pe.anio, pe.numero_semana, cc.nombre AS clasificacion_nombre
                FROM caso_dengue c
                JOIN paciente p ON c.id_paciente = p.id_paciente
                JOIN establecimiento_salud e ON c.id_establecimiento = e.id_establecimiento
                JOIN distrito d ON e.id_distrito = d.id_distrito
                JOIN provincia pr ON d.id_provincia = pr.id_provincia
                JOIN departamento dep ON pr.id_departamento = dep.id_departamento
                JOIN periodo_epidemiologico pe ON c.id_periodo = pe.id_periodo
                JOIN clasificacion_caso cc ON c.id_clasificacion = cc.id_clasificacion
                WHERE 1=1
            """
            params = []
            
            if depto_id:
                query += " AND dep.id_departamento = %s"
                params.append(depto_id)
            if prov_id:
                query += " AND pr.id_provincia = %s"
                params.append(prov_id)
            if dist_id:
                query += " AND d.id_distrito = %s"
                params.append(dist_id)
            if anio:
                query += " AND pe.anio = %s"
                params.append(int(anio))
            if semana:
                query += " AND pe.numero_semana = %s"
                params.append(int(semana))
            if serotipo_id:
                query += " AND c.id_serotipo = %s"
                params.append(int(serotipo_id))
            if clasificacion_id:
                query += " AND c.id_clasificacion = %s"
                params.append(int(clasificacion_id))
                
            query += " ORDER BY c.fecha_notificacion DESC LIMIT 300"
            cur.execute(query, params)
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

    def guardar_paciente(self, paciente: Paciente):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("SELECT 1 FROM paciente WHERE id_paciente = %s", (paciente.id,))
            exists = cur.fetchone()
            if exists:
                cur.execute(
                    """
                    UPDATE paciente 
                    SET documento = %s, nombres = %s, apellidos = %s, fecha_nacimiento = %s, sexo = %s, id_distrito = %s
                    WHERE id_paciente = %s
                    """,
                    (paciente.documento, paciente.nombres, paciente.apellidos, paciente.fecha_nacimiento,
                     paciente.sexo, paciente.id_distrito, paciente.id)
                )
            else:
                if paciente.id is None:
                    cur.execute("SELECT COALESCE(MAX(id_paciente), 0) + 1 FROM paciente")
                    paciente._id = cur.fetchone()[0]
                cur.execute(
                    """
                    INSERT INTO paciente (id_paciente, documento, nombres, apellidos, fecha_nacimiento, sexo, id_distrito)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (paciente.id, paciente.documento, paciente.nombres, paciente.apellidos, paciente.fecha_nacimiento,
                     paciente.sexo, paciente.id_distrito)
                )
            conn.commit()
            return paciente
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def buscar_paciente_por_dni(self, dni):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM paciente WHERE documento = %s", (dni,))
            r = cur.fetchone()
            if r:
                return Paciente(
                    id_paciente=r['id_paciente'],
                    documento=r['documento'],
                    nombres=r['nombres'],
                    apellidos=r['apellidos'],
                    fecha_nacimiento=r['fecha_nacimiento'],
                    sexo=r['sexo'],
                    id_distrito=r['id_distrito']
                )
            return None
        finally:
            cur.close()
            conn.close()

    def eliminar_caso(self, id_caso):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM caso_dengue WHERE id_caso = %s", (id_caso,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()


class RepositorioGeografia:
    def listar_departamentos(self):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM departamento ORDER BY nombre_departamento")
            rows = cur.fetchall()
            return [
                Departamento(
                    id_departamento=r['id_departamento'],
                    nombre_departamento=r['nombre_departamento'],
                    latitud=r['latitud'],
                    longitud=r['longitud'],
                    area_km2=r['area_km2']
                )
                for r in rows
            ]
        finally:
            cur.close()
            conn.close()

    def listar_provincias(self, depto_id=None):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            if depto_id:
                cur.execute("SELECT * FROM provincia WHERE id_departamento = %s ORDER BY nombre_provincia", (depto_id,))
            else:
                cur.execute("SELECT * FROM provincia ORDER BY nombre_provincia")
            rows = cur.fetchall()
            return [
                Provincia(
                    id_provincia=r['id_provincia'],
                    nombre_provincia=r['nombre_provincia'],
                    id_departamento=r['id_departamento'],
                    latitud=r['latitud'],
                    longitud=r['longitud']
                )
                for r in rows
            ]
        finally:
            cur.close()
            conn.close()

    def listar_distritos(self, prov_id=None):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            if prov_id:
                cur.execute("SELECT * FROM distrito WHERE id_provincia = %s ORDER BY nombre_distrito", (prov_id,))
            else:
                cur.execute("SELECT * FROM distrito ORDER BY nombre_distrito")
            rows = cur.fetchall()
            return [
                Distrito(
                    id_distrito=r['id_distrito'],
                    nombre_distrito=r['nombre_distrito'],
                    id_provincia=r['id_provincia'],
                    latitud=r['latitud'],
                    longitud=r['longitud']
                )
                for r in rows
            ]
        finally:
            cur.close()
            conn.close()

    def listar_establecimientos(self, dist_id=None):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            if dist_id:
                cur.execute("SELECT * FROM establecimiento_salud WHERE id_distrito = %s ORDER BY nombre_establecimiento", (dist_id,))
            else:
                cur.execute("SELECT * FROM establecimiento_salud ORDER BY nombre_establecimiento")
            rows = cur.fetchall()
            return [
                EstablecimientoSalud(
                    id_establecimiento=r['id_establecimiento'],
                    nombre_establecimiento=r['nombre_establecimiento'],
                    categoria=r['categoria'],
                    id_distrito=r['id_distrito']
                )
                for r in rows
            ]
        finally:
            cur.close()
            conn.close()

    def listar_profesionales(self, est_id=None):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            if est_id:
                cur.execute("SELECT * FROM profesional_salud WHERE id_establecimiento = %s ORDER BY apellidos", (est_id,))
            else:
                cur.execute("SELECT * FROM profesional_salud ORDER BY apellidos")
            rows = cur.fetchall()
            return [
                ProfesionalSalud(
                    id_profesional=r['id_profesional'],
                    nombres=r['nombres'],
                    apellidos=r['apellidos'],
                    colegiatura=r['colegiatura'],
                    cargo=r['cargo'],
                    id_establecimiento=r['id_establecimiento']
                )
                for r in rows
            ]
        finally:
            cur.close()
            conn.close()

    def listar_serotipos(self):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM serotipo ORDER BY id_serotipo")
            return [Serotipo(r['id_serotipo'], r['codigo'], r['descripcion']) for r in cur.fetchall()]
        finally:
            cur.close()
            conn.close()

    def listar_clasificaciones(self):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM clasificacion_caso ORDER BY id_clasificacion")
            return [ClasificacionCaso(r['id_clasificacion'], r['nombre'], r['descripcion']) for r in cur.fetchall()]
        finally:
            cur.close()
            conn.close()

    def listar_sintomas(self):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM signo_sintoma ORDER BY id_sintoma")
            return [SignoSintoma(r['id_sintoma'], r['nombre']) for r in cur.fetchall()]
        finally:
            cur.close()
            conn.close()

    def guardar_establecimiento(self, est):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            if not est.id_establecimiento:
                cur.execute("SELECT COALESCE(MAX(id_establecimiento), 0) + 1 FROM establecimiento_salud")
                est.id_establecimiento = cur.fetchone()[0]
                exists = False
            else:
                cur.execute("SELECT 1 FROM establecimiento_salud WHERE id_establecimiento = %s", (est.id_establecimiento,))
                exists = cur.fetchone() is not None

            if exists:
                cur.execute(
                    """
                    UPDATE establecimiento_salud 
                    SET nombre_establecimiento = %s, categoria = %s, id_distrito = %s
                    WHERE id_establecimiento = %s
                    """,
                    (est.nombre_establecimiento, est.categoria, est.id_distrito, est.id_establecimiento)
                )
            else:
                cur.execute(
                    """
                    INSERT INTO establecimiento_salud (id_establecimiento, nombre_establecimiento, categoria, id_distrito)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (est.id_establecimiento, est.nombre_establecimiento, est.categoria, est.id_distrito)
                )
            conn.commit()
            return est
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def eliminar_establecimiento(self, id_establecimiento):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM establecimiento_salud WHERE id_establecimiento = %s", (id_establecimiento,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def guardar_profesional(self, prof):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            id_prof = prof.id
            if not id_prof:
                cur.execute("SELECT COALESCE(MAX(id_profesional), 0) + 1 FROM profesional_salud")
                id_prof = cur.fetchone()[0]
                prof._id = id_prof
                exists = False
            else:
                cur.execute("SELECT 1 FROM profesional_salud WHERE id_profesional = %s", (id_prof,))
                exists = cur.fetchone() is not None

            if exists:
                cur.execute(
                    """
                    UPDATE profesional_salud 
                    SET nombres = %s, apellidos = %s, colegiatura = %s, cargo = %s, id_establecimiento = %s
                    WHERE id_profesional = %s
                    """,
                    (prof.nombres, prof.apellidos, prof.colegiatura, prof.cargo, prof.id_establecimiento, id_prof)
                )
            else:
                cur.execute(
                    """
                    INSERT INTO profesional_salud (id_profesional, nombres, apellidos, colegiatura, cargo, id_establecimiento)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (id_prof, prof.nombres, prof.apellidos, prof.colegiatura, prof.cargo, prof.id_establecimiento)
                )
            conn.commit()
            return prof
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def eliminar_profesional(self, id_profesional):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM profesional_salud WHERE id_profesional = %s", (id_profesional,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def guardar_serotipo(self, sero):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            if not sero.id_serotipo:
                cur.execute("SELECT COALESCE(MAX(id_serotipo), 0) + 1 FROM serotipo")
                sero.id_serotipo = cur.fetchone()[0]
                exists = False
            else:
                cur.execute("SELECT 1 FROM serotipo WHERE id_serotipo = %s", (sero.id_serotipo,))
                exists = cur.fetchone() is not None

            if exists:
                cur.execute(
                    """
                    UPDATE serotipo 
                    SET codigo = %s, descripcion = %s
                    WHERE id_serotipo = %s
                    """,
                    (sero.codigo, sero.descripcion, sero.id_serotipo)
                )
            else:
                cur.execute(
                    """
                    INSERT INTO serotipo (id_serotipo, codigo, descripcion)
                    VALUES (%s, %s, %s)
                    """,
                    (sero.id_serotipo, sero.codigo, sero.descripcion)
                )
            conn.commit()
            return sero
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def eliminar_serotipo(self, id_serotipo):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM serotipo WHERE id_serotipo = %s", (id_serotipo,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def guardar_clasificacion(self, clas):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            if not clas.id_clasificacion:
                cur.execute("SELECT COALESCE(MAX(id_clasificacion), 0) + 1 FROM clasificacion_caso")
                clas.id_clasificacion = cur.fetchone()[0]
                exists = False
            else:
                cur.execute("SELECT 1 FROM clasificacion_caso WHERE id_clasificacion = %s", (clas.id_clasificacion,))
                exists = cur.fetchone() is not None

            if exists:
                cur.execute(
                    """
                    UPDATE clasificacion_caso 
                    SET nombre = %s, descripcion = %s
                    WHERE id_clasificacion = %s
                    """,
                    (clas.nombre, clas.descripcion, clas.id_clasificacion)
                )
            else:
                cur.execute(
                    """
                    INSERT INTO clasificacion_caso (id_clasificacion, nombre, descripcion)
                    VALUES (%s, %s, %s)
                    """,
                    (clas.id_clasificacion, clas.nombre, clas.descripcion)
                )
            conn.commit()
            return clas
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def eliminar_clasificacion(self, id_clasificacion):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM clasificacion_caso WHERE id_clasificacion = %s", (id_clasificacion,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def guardar_sintoma(self, sint):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            if not sint.id_sintoma:
                cur.execute("SELECT COALESCE(MAX(id_sintoma), 0) + 1 FROM signo_sintoma")
                sint.id_sintoma = cur.fetchone()[0]
                exists = False
            else:
                cur.execute("SELECT 1 FROM signo_sintoma WHERE id_sintoma = %s", (sint.id_sintoma,))
                exists = cur.fetchone() is not None

            if exists:
                cur.execute(
                    """
                    UPDATE signo_sintoma 
                    SET nombre = %s
                    WHERE id_sintoma = %s
                    """,
                    (sint.nombre, sint.id_sintoma)
                )
            else:
                cur.execute(
                    """
                    INSERT INTO signo_sintoma (id_sintoma, nombre)
                    VALUES (%s, %s)
                    """,
                    (sint.id_sintoma, sint.nombre)
                )
            conn.commit()
            return sint
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def eliminar_sintoma(self, id_sintoma):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM signo_sintoma WHERE id_sintoma = %s", (id_sintoma,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()



class RepositorioClima(RepositorioBase):
    def guardar(self, medida: MedidaClimatica):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("SELECT 1 FROM medida_climatica WHERE id_medida = %s", (medida.id_medida,))
            exists = cur.fetchone()
            if exists:
                cur.execute(
                    """
                    UPDATE medida_climatica 
                    SET id_departamento = %s, id_periodo = %s, temp_media_c = %s, temp_max_c = %s, precip_total_mm = %s
                    WHERE id_medida = %s
                    """,
                    (medida.id_departamento, medida.id_periodo, medida.temp_media_c, medida.temp_max_c, medida.precip_total_mm, medida.id_medida)
                )
            else:
                if medida.id_medida is None:
                    cur.execute("SELECT COALESCE(MAX(id_medida), 0) + 1 FROM medida_climatica")
                    medida.id_medida = cur.fetchone()[0]
                cur.execute(
                    """
                    INSERT INTO medida_climatica (id_medida, id_departamento, id_periodo, temp_media_c, temp_max_c, precip_total_mm)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (medida.id_medida, medida.id_departamento, medida.id_periodo, medida.temp_media_c, medida.temp_max_c, medida.precip_total_mm)
                )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def buscar_por_id(self, id_medida):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM medida_climatica WHERE id_medida = %s", (id_medida,))
            r = cur.fetchone()
            if r:
                return MedidaClimatica(r['id_medida'], r['id_departamento'], r['id_periodo'], r['temp_media_c'], r['temp_max_c'], r['precip_total_mm'])
            return None
        finally:
            cur.close()
            conn.close()

    def buscar_clima_departamento_periodo(self, id_departamento, id_periodo):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM medida_climatica WHERE id_departamento = %s AND id_periodo = %s", (id_departamento, id_periodo))
            r = cur.fetchone()
            if r:
                return MedidaClimatica(r['id_medida'], r['id_departamento'], r['id_periodo'], r['temp_media_c'], r['temp_max_c'], r['precip_total_mm'])
            return None
        finally:
            cur.close()
            conn.close()

    def listar(self):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM medida_climatica ORDER BY id_medida DESC LIMIT 1000")
            rows = cur.fetchall()
            return [
                MedidaClimatica(r['id_medida'], r['id_departamento'], r['id_periodo'], r['temp_media_c'], r['temp_max_c'], r['precip_total_mm'])
                for r in rows
            ]
        finally:
            cur.close()
            conn.close()

    def buscar_ultimo_periodo_epidemiologico(self):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM periodo_epidemiologico ORDER BY id_periodo DESC LIMIT 1")
            r = cur.fetchone()
            if r:
                return PeriodoEpidemiologico(r['id_periodo'], r['anio'], r['numero_semana'], r['fecha_inicio'], r['fecha_fin'])
            return None
        finally:
            cur.close()
            conn.close()

    def buscar_periodo_por_id(self, id_periodo):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM periodo_epidemiologico WHERE id_periodo = %s", (id_periodo,))
            r = cur.fetchone()
            if r:
                return PeriodoEpidemiologico(r['id_periodo'], r['anio'], r['numero_semana'], r['fecha_inicio'], r['fecha_fin'])
            return None
        finally:
            cur.close()
            conn.close()

    def buscar_periodo_por_fecha(self, fecha):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM periodo_epidemiologico WHERE %s BETWEEN fecha_inicio AND fecha_fin LIMIT 1", (fecha,))
            r = cur.fetchone()
            if r:
                return PeriodoEpidemiologico(r['id_periodo'], r['anio'], r['numero_semana'], r['fecha_inicio'], r['fecha_fin'])
            return None
        finally:
            cur.close()
            conn.close()

    def listar_periodos(self):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM periodo_epidemiologico ORDER BY id_periodo")
            return [
                PeriodoEpidemiologico(r['id_periodo'], r['anio'], r['numero_semana'], r['fecha_inicio'], r['fecha_fin'])
                for r in cur.fetchall()
            ]
        finally:
            cur.close()
            conn.close()

    # Predicciones y Alertas
    def guardar_prediccion(self, pred: PrediccionAlerta):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor()
        try:
            if pred.id_prediccion is None:
                cur.execute("SELECT COALESCE(MAX(id_prediccion), 0) + 1 FROM prediccion_alerta")
                pred.id_prediccion = cur.fetchone()[0]
            cur.execute(
                """
                INSERT INTO prediccion_alerta (id_prediccion, id_departamento, id_periodo, casos_observados, 
                                               casos_predichos, casos_esperados, nivel_alerta, modelo, mae, generado_en)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (pred.id_prediccion, pred.id_departamento, pred.id_periodo, pred.casos_observados,
                 pred.casos_predichos, pred.casos_esperados, pred.nivel_alerta, pred.modelo, pred.mae, pred.generado_en)
            )
            conn.commit()
            return pred
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def listar_predicciones(self, id_departamento=None):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            if id_departamento:
                cur.execute(
                    """
                    SELECT p.*, pe.anio, pe.numero_semana 
                    FROM prediccion_alerta p
                    JOIN periodo_epidemiologico pe ON p.id_periodo = pe.id_periodo
                    WHERE p.id_departamento = %s
                    ORDER BY p.id_periodo DESC LIMIT 20
                    """,
                    (id_departamento,)
                )
            else:
                cur.execute(
                    """
                    SELECT p.*, pe.anio, pe.numero_semana 
                    FROM prediccion_alerta p
                    JOIN periodo_epidemiologico pe ON p.id_periodo = pe.id_periodo
                    ORDER BY p.id_periodo DESC LIMIT 100
                    """
                )
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()


class RepositorioEstadistica:
    @staticmethod
    def obtener_casos_semanales(depto_id=None, prov_id=None, dist_id=None, anio=None, semana_inicio=None, semana_fin=None):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Encontrar el departamento_id efectivo para el filtro del clima
            clima_depto_id = depto_id
            if not clima_depto_id and prov_id:
                cur.execute("SELECT id_departamento FROM provincia WHERE id_provincia = %s", (prov_id,))
                row = cur.fetchone()
                if row:
                    clima_depto_id = row['id_departamento']
            elif not clima_depto_id and dist_id:
                cur.execute("""
                    SELECT pr.id_departamento 
                    FROM distrito d 
                    JOIN provincia pr ON d.id_provincia = pr.id_provincia 
                    WHERE d.id_distrito = %s
                """, (dist_id,))
                row = cur.fetchone()
                if row:
                    clima_depto_id = row['id_departamento']

            query = """
                SELECT pe.anio, pe.numero_semana, COUNT(c.id_caso) AS casos,
                       mc.temperatura
                FROM periodo_epidemiologico pe
                LEFT JOIN caso_dengue c ON c.id_periodo = pe.id_periodo
            """
            joins = ""
            params_joins = []
            where_clauses = ["pe.id_periodo <= (SELECT COALESCE(MAX(id_periodo), 0) FROM caso_dengue)"]
            params = []

            if depto_id or prov_id or dist_id:
                joins += """
                    LEFT JOIN establecimiento_salud e ON c.id_establecimiento = e.id_establecimiento
                    LEFT JOIN distrito d ON e.id_distrito = d.id_distrito
                    LEFT JOIN provincia pr ON d.id_provincia = pr.id_provincia
                """
                if depto_id:
                    where_clauses.append("pr.id_departamento = %s")
                    params.append(depto_id)
                if prov_id:
                    where_clauses.append("pr.id_provincia = %s")
                    params.append(prov_id)
                if dist_id:
                    where_clauses.append("d.id_distrito = %s")
                    params.append(dist_id)

            if clima_depto_id:
                joins += """
                    LEFT JOIN (
                        SELECT id_periodo, ROUND(AVG(temp_media_c), 1)::float AS temperatura
                        FROM medida_climatica
                        WHERE id_departamento = %s
                        GROUP BY id_periodo
                    ) mc ON mc.id_periodo = pe.id_periodo
                """
                params_joins.append(clima_depto_id)
            else:
                joins += """
                    LEFT JOIN (
                        SELECT id_periodo, ROUND(AVG(temp_media_c), 1)::float AS temperatura
                        FROM medida_climatica
                        GROUP BY id_periodo
                    ) mc ON mc.id_periodo = pe.id_periodo
                """

            if anio:
                try:
                    where_clauses.append("pe.anio = %s")
                    params.append(int(anio))
                except ValueError:
                    pass

            if semana_inicio:
                try:
                    where_clauses.append("pe.numero_semana >= %s")
                    params.append(int(semana_inicio))
                except ValueError:
                    pass

            if semana_fin:
                try:
                    where_clauses.append("pe.numero_semana <= %s")
                    params.append(int(semana_fin))
                except ValueError:
                    pass

            query += joins
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
                
            query += " GROUP BY pe.id_periodo, pe.anio, pe.numero_semana, mc.temperatura ORDER BY pe.id_periodo"
            cur.execute(query, params_joins + params)
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def obtener_distribucion_serotipos(depto_id=None, prov_id=None, dist_id=None, anio=None, semana_inicio=None, semana_fin=None):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            query = """
                SELECT s.codigo AS serotipo, COUNT(c.id_caso) AS casos
                FROM serotipo s
                JOIN caso_dengue c ON c.id_serotipo = s.id_serotipo
                JOIN periodo_epidemiologico pe ON c.id_periodo = pe.id_periodo
            """
            joins = ""
            where_clauses = []
            params = []

            if depto_id or prov_id or dist_id:
                joins += """
                    JOIN establecimiento_salud e ON c.id_establecimiento = e.id_establecimiento
                    JOIN distrito d ON e.id_distrito = d.id_distrito
                    JOIN provincia pr ON d.id_provincia = pr.id_provincia
                """
                if depto_id:
                    where_clauses.append("pr.id_departamento = %s")
                    params.append(depto_id)
                if prov_id:
                    where_clauses.append("pr.id_provincia = %s")
                    params.append(prov_id)
                if dist_id:
                    where_clauses.append("d.id_distrito = %s")
                    params.append(dist_id)

            if anio:
                try:
                    where_clauses.append("pe.anio = %s")
                    params.append(int(anio))
                except ValueError:
                    pass

            if semana_inicio:
                try:
                    where_clauses.append("pe.numero_semana >= %s")
                    params.append(int(semana_inicio))
                except ValueError:
                    pass

            if semana_fin:
                try:
                    where_clauses.append("pe.numero_semana <= %s")
                    params.append(int(semana_fin))
                except ValueError:
                    pass

            query += joins
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
                
            query += " GROUP BY s.codigo ORDER BY casos DESC"
            cur.execute(query, params)
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def obtener_letalidad_departamentos(depto_id=None, prov_id=None, dist_id=None, anio=None, semana_inicio=None, semana_fin=None):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Seleccionar nivel de agregación según los filtros geográficos
            if dist_id:
                select_clause = "es.id_establecimiento AS id_lugar, es.nombre_establecimiento AS nombre_lugar"
                group_clause = "es.id_establecimiento, es.nombre_establecimiento"
            elif prov_id:
                select_clause = "di.id_distrito AS id_lugar, di.nombre_distrito AS nombre_lugar"
                group_clause = "di.id_distrito, di.nombre_distrito"
            elif depto_id:
                select_clause = "p.id_provincia AS id_lugar, p.nombre_provincia AS nombre_lugar"
                group_clause = "p.id_provincia, p.nombre_provincia"
            else:
                select_clause = "d.id_departamento AS id_lugar, d.nombre_departamento AS nombre_lugar"
                group_clause = "d.id_departamento, d.nombre_departamento"

            query = f"""
                SELECT {select_clause},
                       COUNT(*) AS casos,
                       SUM(CASE WHEN c.condicion = 'Fallecido' THEN 1 ELSE 0 END) AS fallecidos,
                       ROUND(100.0 * SUM(CASE WHEN c.condicion = 'Fallecido' THEN 1 ELSE 0 END) / COUNT(*), 2) AS letalidad_pct
                FROM caso_dengue c
                JOIN establecimiento_salud es ON c.id_establecimiento = es.id_establecimiento
                JOIN distrito di ON es.id_distrito = di.id_distrito
                JOIN provincia p ON di.id_provincia = p.id_provincia
                JOIN departamento d ON p.id_departamento = d.id_departamento
                JOIN periodo_epidemiologico pe ON c.id_periodo = pe.id_periodo
            """
            
            where_clauses = []
            params = []
            
            if depto_id:
                where_clauses.append("d.id_departamento = %s")
                params.append(depto_id)
            if prov_id:
                where_clauses.append("p.id_provincia = %s")
                params.append(prov_id)
            if dist_id:
                where_clauses.append("di.id_distrito = %s")
                params.append(dist_id)
                
            if anio:
                try:
                    where_clauses.append("pe.anio = %s")
                    params.append(int(anio))
                except ValueError:
                    pass

            if semana_inicio:
                try:
                    where_clauses.append("pe.numero_semana >= %s")
                    params.append(int(semana_inicio))
                except ValueError:
                    pass

            if semana_fin:
                try:
                    where_clauses.append("pe.numero_semana <= %s")
                    params.append(int(semana_fin))
                except ValueError:
                    pass

            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
                
            query += f" GROUP BY {group_clause} ORDER BY casos DESC"
            cur.execute(query, params)
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def obtener_distribucion_sintomas(depto_id=None, prov_id=None, dist_id=None, anio=None, semana_inicio=None, semana_fin=None):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            query = """
                SELECT ss.nombre AS sintoma, COUNT(cs.id_caso) AS casos
                FROM signo_sintoma ss
                JOIN caso_signo cs ON cs.id_sintoma = ss.id_sintoma
                JOIN caso_dengue c ON cs.id_caso = c.id_caso
                JOIN periodo_epidemiologico pe ON c.id_periodo = pe.id_periodo
            """
            joins = ""
            where_clauses = []
            params = []

            if depto_id or prov_id or dist_id:
                joins += """
                    JOIN establecimiento_salud e ON c.id_establecimiento = e.id_establecimiento
                    JOIN distrito d ON e.id_distrito = d.id_distrito
                    JOIN provincia pr ON d.id_provincia = pr.id_provincia
                """
                if depto_id:
                    where_clauses.append("pr.id_departamento = %s")
                    params.append(depto_id)
                if prov_id:
                    where_clauses.append("pr.id_provincia = %s")
                    params.append(prov_id)
                if dist_id:
                    where_clauses.append("d.id_distrito = %s")
                    params.append(dist_id)

            if anio:
                try:
                    where_clauses.append("pe.anio = %s")
                    params.append(int(anio))
                except ValueError:
                    pass

            if semana_inicio:
                try:
                    where_clauses.append("pe.numero_semana >= %s")
                    params.append(int(semana_inicio))
                except ValueError:
                    pass

            if semana_fin:
                try:
                    where_clauses.append("pe.numero_semana <= %s")
                    params.append(int(semana_fin))
                except ValueError:
                    pass

            query += joins
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
                
            query += " GROUP BY ss.nombre ORDER BY casos DESC"
            cur.execute(query, params)
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def obtener_resumen_indicadores(depto_id=None, prov_id=None, dist_id=None, anio=None, semana_inicio=None, semana_fin=None):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            poblacion = 33000000.0
            if depto_id:
                pob_dict = {
                    'PE01': 430000, 'PE02': 1200000, 'PE03': 430000, 'PE04': 1500000,
                    'PE05': 670000, 'PE06': 1500000, 'PE07': 1100000, 'PE08': 1400000,
                    'PE09': 350000, 'PE10': 760000, 'PE11': 980000, 'PE12': 1400000,
                    'PE13': 2000000, 'PE14': 1300000, 'PE15': 10000000, 'PE16': 1000000,
                    'PE17': 180000, 'PE18': 190000, 'PE19': 270000, 'PE20': 2100000,
                    'PE21': 1200000, 'PE22': 900000, 'PE23': 370000, 'PE24': 250000,
                    'PE25': 600000
                }
                poblacion = pob_dict.get(depto_id, 500000)
                if dist_id:
                    poblacion = 40000.0
                elif prov_id:
                    poblacion = 150000.0

            # Consulta unificada para obtener casos totales, fallecidos y confirmados
            query = """
                SELECT 
                    COUNT(c.id_caso) AS total_casos,
                    SUM(CASE WHEN c.condicion = 'Fallecido' THEN 1 ELSE 0 END) AS total_fallecidos,
                    SUM(CASE WHEN c.tipo_diagnostico = 'Confirmado' THEN 1 ELSE 0 END) AS total_confirmados
                FROM caso_dengue c
                JOIN establecimiento_salud e ON c.id_establecimiento = e.id_establecimiento
                JOIN distrito d ON e.id_distrito = d.id_distrito
                JOIN provincia pr ON d.id_provincia = pr.id_provincia
                JOIN periodo_epidemiologico pe ON c.id_periodo = pe.id_periodo
            """
            where_clauses = []
            params = []
            
            if depto_id:
                where_clauses.append("pr.id_departamento = %s")
                params.append(depto_id)
            if prov_id:
                where_clauses.append("pr.id_provincia = %s")
                params.append(prov_id)
            if dist_id:
                where_clauses.append("d.id_distrito = %s")
                params.append(dist_id)
            if anio:
                try:
                    where_clauses.append("pe.anio = %s")
                    params.append(int(anio))
                except ValueError:
                    pass
            if semana_inicio:
                try:
                    where_clauses.append("pe.numero_semana >= %s")
                    params.append(int(semana_inicio))
                except ValueError:
                    pass
            if semana_fin:
                try:
                    where_clauses.append("pe.numero_semana <= %s")
                    params.append(int(semana_fin))
                except ValueError:
                    pass

            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
                
            cur.execute(query, params)
            res = cur.fetchone()
            
            total_casos = res['total_casos'] if res and res['total_casos'] else 0
            total_fallecidos = res['total_fallecidos'] if res and res['total_fallecidos'] else 0
            total_confirmados = res['total_confirmados'] if res and res['total_confirmados'] else 0
            
            letalidad = round(100.0 * total_fallecidos / total_casos, 2) if total_casos > 0 else 0.0
            incidencia = round(100000.0 * total_casos / poblacion, 2)
            
            # Alertas activas
            alert_query = "SELECT COUNT(*) FROM prediccion_alerta WHERE nivel_alerta = 'Alerta'"
            alert_params = []
            
            if depto_id:
                alert_query += " AND id_departamento = %s"
                alert_params.append(depto_id)
                
            if anio or semana_inicio or semana_fin:
                pe_id_sub = "SELECT id_periodo FROM periodo_epidemiologico WHERE 1=1"
                pe_params = []
                if anio:
                    pe_id_sub += " AND anio = %s"
                    pe_params.append(int(anio))
                if semana_fin:
                    pe_id_sub += " AND numero_semana <= %s"
                    pe_params.append(int(semana_fin))
                if semana_inicio:
                    pe_id_sub += " AND numero_semana >= %s"
                    pe_params.append(int(semana_inicio))
                pe_id_sub += " ORDER BY id_periodo DESC LIMIT 1"
                alert_query += f" AND id_periodo = ({pe_id_sub})"
                alert_params.extend(pe_params)
            else:
                alert_query += " AND id_periodo = (SELECT MAX(id_periodo) FROM prediccion_alerta)"
                
            cur.execute(alert_query, alert_params)
            alertas = cur.fetchone()['count'] if cur.rowcount > 0 else 0
            
            return {
                'total_casos': total_casos,
                'total_fallecidos': total_fallecidos,
                'total_confirmados': total_confirmados,
                'letalidad_pct': letalidad,
                'incidencia_por_100k': incidencia,
                'alertas_activas': alertas
            }
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def obtener_resumen_indicadores_filtrado(depto_id=None, prov_id=None, dist_id=None, anio=None, semana=None, serotipo_id=None, clasificacion_id=None):
        conn = DatabaseConnection.get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Función auxiliar para conversión de tipos segura (evita errores si el LLM extrae listas o cadenas)
            def parse_safe_int(val):
                if val is None or val == "":
                    return None
                if isinstance(val, list):
                    if len(val) > 0:
                        val = val[0]
                    else:
                        return None
                try:
                    return int(val)
                except (ValueError, TypeError):
                    return None

            anio_int = parse_safe_int(anio)
            semana_int = parse_safe_int(semana)
            serotipo_int = parse_safe_int(serotipo_id)
            clasificacion_int = parse_safe_int(clasificacion_id)

            # Población base por defecto
            poblacion = 33000000.0
            if depto_id:
                pob_dict = {
                    'PE01': 430000, 'PE02': 1200000, 'PE03': 430000, 'PE04': 1500000,
                    'PE05': 670000, 'PE06': 1500000, 'PE07': 1100000, 'PE08': 1400000,
                    'PE09': 350000, 'PE10': 760000, 'PE11': 980000, 'PE12': 1400000,
                    'PE13': 2000000, 'PE14': 1300000, 'PE15': 10000000, 'PE16': 1000000,
                    'PE17': 180000, 'PE18': 190000, 'PE19': 270000, 'PE20': 2100000,
                    'PE21': 1200000, 'PE22': 900000, 'PE23': 370000, 'PE24': 250000,
                    'PE25': 600000
                }
                poblacion = pob_dict.get(depto_id, 500000)
                if dist_id:
                    poblacion = 40000.0
                elif prov_id:
                    poblacion = 150000.0

            query = """
                SELECT 
                    COUNT(c.id_caso) AS total_casos,
                    SUM(CASE WHEN c.condicion = 'Fallecido' THEN 1 ELSE 0 END) AS total_fallecidos,
                    SUM(CASE WHEN c.tipo_diagnostico = 'Confirmado' THEN 1 ELSE 0 END) AS total_confirmados
                FROM caso_dengue c
                JOIN establecimiento_salud e ON c.id_establecimiento = e.id_establecimiento
                JOIN distrito d ON e.id_distrito = d.id_distrito
                JOIN provincia pr ON d.id_provincia = pr.id_provincia
                JOIN departamento dep ON pr.id_departamento = dep.id_departamento
                JOIN periodo_epidemiologico pe ON c.id_periodo = pe.id_periodo
                WHERE 1=1
            """
            params = []
            if depto_id:
                query += " AND dep.id_departamento = %s"
                params.append(depto_id)
            if prov_id:
                query += " AND pr.id_provincia = %s"
                params.append(prov_id)
            if dist_id:
                query += " AND d.id_distrito = %s"
                params.append(dist_id)
            if anio_int is not None:
                query += " AND pe.anio = %s"
                params.append(anio_int)
            if semana_int is not None:
                query += " AND pe.numero_semana = %s"
                params.append(semana_int)
            if serotipo_int is not None:
                query += " AND c.id_serotipo = %s"
                params.append(serotipo_int)
            if clasificacion_int is not None:
                query += " AND c.id_clasificacion = %s"
                params.append(clasificacion_int)

            cur.execute(query, params)
            res = cur.fetchone()
            
            total_casos = res['total_casos'] if res and res['total_casos'] else 0
            total_fallecidos = res['total_fallecidos'] if res and res['total_fallecidos'] else 0
            total_confirmados = res['total_confirmados'] if res and res['total_confirmados'] else 0
            
            letalidad = round(100.0 * total_fallecidos / total_casos, 2) if total_casos > 0 else 0.0
            incidencia = round(100000.0 * total_casos / poblacion, 2)
            
            # Contar alertas activas en el periodo especificado
            alert_query = "SELECT COUNT(*) FROM prediccion_alerta WHERE nivel_alerta = 'Alerta'"
            alert_params = []
            if depto_id:
                alert_query += " AND id_departamento = %s"
                alert_params.append(depto_id)
            if anio_int is not None or semana_int is not None:
                pe_id_sub = "SELECT id_periodo FROM periodo_epidemiologico WHERE 1=1"
                pe_params = []
                if anio_int is not None:
                    pe_id_sub += " AND anio = %s"
                    pe_params.append(anio_int)
                if semana_int is not None:
                    pe_id_sub += " AND numero_semana = %s"
                    pe_params.append(semana_int)
                pe_id_sub += " ORDER BY id_periodo DESC LIMIT 1"
                alert_query += f" AND id_periodo = ({pe_id_sub})"
                alert_params.extend(pe_params)
            else:
                alert_query += " AND id_periodo = (SELECT MAX(id_periodo) FROM prediccion_alerta)"
                
            cur.execute(alert_query, alert_params)
            alertas = cur.fetchone()['count'] if cur.rowcount > 0 else 0
            
            return {
                'total_casos': total_casos,
                'total_fallecidos': total_fallecidos,
                'total_confirmados': total_confirmados,
                'letalidad_pct': letalidad,
                'incidencia_por_100k': incidencia,
                'alertas_activas': alertas
            }
        finally:
            cur.close()
            conn.close()
