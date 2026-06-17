from abc import ABC, abstractmethod

class RepositorioBase(ABC):
    
    @abstractmethod
    def guardar(self, entidad):
        """Guarda o actualiza una entidad en la base de datos."""
        pass
        
    @abstractmethod
    def buscar_por_id(self, id_entidad):
        """Busca una entidad por su identificador único."""
        pass
        
    @abstractmethod
    def listar(self):
        """Lista todas las entidades."""
        pass
