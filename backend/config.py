import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'sived_secret_key_2026_maestria_unam')
    # Cadena de conexión para PostgreSQL en macOS (usualmente sin contraseña por socket local)
    DATABASE_URI = os.environ.get('DATABASE_URI', 'postgresql://mac-mermitas@localhost:5432/sived')
    DEBUG = True
