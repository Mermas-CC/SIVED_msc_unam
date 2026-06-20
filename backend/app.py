import sys
import os

# Añadir el directorio raíz al path de Python para evitar errores de importación
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import Config
from backend.controladores.controladores import auth_bp, casos_bp, geo_bp, dash_bp, pron_bp, usr_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Habilitar CORS para permitir peticiones desde el frontend de React (por ejemplo en localhost:5173)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Registrar Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(casos_bp, url_prefix='/api/casos')
    app.register_blueprint(geo_bp, url_prefix='/api/geografia')
    app.register_blueprint(dash_bp, url_prefix='/api/dashboard')
    app.register_blueprint(pron_bp, url_prefix='/api/pronostico')
    app.register_blueprint(usr_bp, url_prefix='/api/usuarios')
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'ok', 'message': 'SIVED-Perú backend is running'})

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'mensaje': 'Recurso no encontrado'}), 404

    @app.errorhandler(500)
    def server_error(error):
        return jsonify({'mensaje': 'Error interno del servidor', 'error': str(error)}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    # Ejecutar en el puerto 5005 por defecto
    app.run(host='0.0.0.0', port=5005, debug=True)
