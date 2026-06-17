from abc import ABC, abstractmethod
from datetime import datetime

class Persona(ABC):
    def __init__(self, id_persona, nombres, apellidos):
        self._id = id_persona
        self._nombres = nombres
        self._apellidos = apellidos

    @property
    def id(self):
        return self._id

    @property
    def nombres(self):
        return self._nombres

    @nombres.setter
    def nombres(self, value):
        self._nombres = value

    @property
    def apellidos(self):
        return self._apellidos

    @apellidos.setter
    def apellidos(self, value):
        self._apellidos = value

    def get_nombre_completo(self):
        return f"{self._nombres} {self._apellidos}"


class Paciente(Persona):
    def __init__(self, id_paciente, documento, nombres, apellidos, fecha_nacimiento, sexo, id_distrito):
        super().__init__(id_paciente, nombres, apellidos)
        self._documento = documento
        self._fecha_nacimiento = fecha_nacimiento  # Puede ser objeto date o string YYYY-MM-DD
        self._sexo = sexo
        self._id_distrito = id_distrito

    @property
    def documento(self):
        return self._documento

    @documento.setter
    def documento(self, value):
        self._documento = value

    @property
    def fecha_nacimiento(self):
        return self._fecha_nacimiento

    @fecha_nacimiento.setter
    def fecha_nacimiento(self, value):
        self._fecha_nacimiento = value

    @property
    def sexo(self):
        return self._sexo

    @sexo.setter
    def sexo(self, value):
        self._sexo = value

    @property
    def id_distrito(self):
        return self._id_distrito

    @id_distrito.setter
    def id_distrito(self, value):
        self._id_distrito = value

    def calcular_edad(self):
        if not self._fecha_nacimiento:
            return 0
        
        # Convertir a datetime si es un string
        f_nac = self._fecha_nacimiento
        if isinstance(f_nac, str):
            try:
                f_nac = datetime.strptime(f_nac, "%Y-%m-%d").date()
            except ValueError:
                return 0
        elif isinstance(f_nac, datetime):
            f_nac = f_nac.date()
            
        hoy = datetime.now().date()
        edad = hoy.year - f_nac.year - ((hoy.month, hoy.day) < (f_nac.month, f_nac.day))
        return edad


class ProfesionalSalud(Persona):
    def __init__(self, id_profesional, nombres, apellidos, colegiatura, cargo, id_establecimiento):
        super().__init__(id_profesional, nombres, apellidos)
        self._colegiatura = colegiatura
        self._cargo = cargo
        self._id_establecimiento = id_establecimiento

    @property
    def colegiatura(self):
        return self._colegiatura

    @colegiatura.setter
    def colegiatura(self, value):
        self._colegiatura = value

    @property
    def cargo(self):
        return self._cargo

    @cargo.setter
    def cargo(self, value):
        self._cargo = value

    @property
    def id_establecimiento(self):
        return self._id_establecimiento

    @id_establecimiento.setter
    def id_establecimiento(self, value):
        self._id_establecimiento = value
