from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import os
import logging

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_name='development'):
    """Factory para crear la aplicación Flask"""
    from config import config
    
    # Crear instancia de Flask
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)
    
    # Crear directorios necesarios
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['RESULTADOS_FOLDER'], exist_ok=True)
    os.makedirs(app.config['TEMP_FOLDER'], exist_ok=True)
    os.makedirs('logs', exist_ok=True)
    
    # Configurar logging
    if not app.debug:
        file_handler = logging.FileHandler('logs/app.log')
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s'
        ))
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
    
    # =====================
    # HEALTH CHECK
    # =====================
    @app.route('/api/health', methods=['GET'])
    def health():
        from flask import jsonify
        return jsonify({
            'status': 'ok',
            'message': 'Centro Diagnóstico API',
            'environment': app.config.get('FLASK_ENV', 'production'),
            'version': '1.0.0'
        }), 200
    
    # =====================
    # REGISTRAR BLUEPRINTS
    # =====================
    try:
        from app.routes.auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.logger.info('Blueprint auth registrado')
    except Exception as e:
        app.logger.warning(f'No se pudo cargar auth blueprint: {e}')
    
    # =====================
    # ERROR HANDLERS
    # =====================
    @app.errorhandler(404)
    def not_found(error):
        from flask import jsonify
        return jsonify({'error': 'Endpoint no encontrado'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        from flask import jsonify
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500
    
    @app.errorhandler(401)
    def unauthorized(error):
        from flask import jsonify
        return jsonify({'error': 'No autorizado'}), 401
    
    return app
