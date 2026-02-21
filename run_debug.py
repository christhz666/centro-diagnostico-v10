import os
from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-jwt')

CORS(app)
jwt = JWTManager(app)

# Usuarios de prueba
USERS = {
    'admin': {'password': 'admin123', 'nombre': 'Administrador', 'email': 'admin@centro.com', 'rol': 'admin'},
    'doctor': {'password': 'doctor123', 'nombre': 'Doctor', 'email': 'doctor@centro.com', 'rol': 'medico'},
    'lab': {'password': 'lab123', 'nombre': 'Laboratorio', 'email': 'lab@centro.com', 'rol': 'lab'}
}

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'API funcionando', 'environment': 'production'}), 200

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username y password requeridos'}), 400
    
    user = USERS.get(username)
    if not user or user['password'] != password:
        return jsonify({'error': 'Credenciales inválidas'}), 401
    
    access_token = create_access_token(identity=username, expires_delta=timedelta(hours=8))
    refresh_token = create_access_token(identity=username, expires_delta=timedelta(days=30), fresh=False)
    
    return jsonify({
        'success': True,
        'access_token': access_token,
        'refresh_token': refresh_token,
        'usuario': {'username': username, 'nombre': user['nombre'], 'email': user['email'], 'rol': user['rol']}
    }), 200

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    identity = get_jwt_identity()
    user = USERS.get(identity)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    return jsonify({'username': identity, 'nombre': user['nombre'], 'email': user['email'], 'rol': user['rol']}), 200

@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity, expires_delta=timedelta(hours=8))
    return jsonify({'access_token': access_token}), 200

@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'message': 'Logged out successfully'}), 200

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint no encontrado'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Error interno'}), 500

@app.errorhandler(401)
def unauthorized(e):
    return jsonify({'error': 'No autorizado'}), 401

if __name__ == '__main__':
    print("? Iniciando Centro Diagnóstico API")
    print("? Usuarios: admin, doctor, lab")
    print("? Contraseña: [username]123 (admin123, doctor123, lab123)")
    print("? Endpoints:")
    print("    GET  /api/health")
    print("    POST /api/auth/login")
    print("    GET  /api/auth/me (requiere token)")
    print("    POST /api/auth/refresh (requiere refresh token)")
    print("    POST /api/auth/logout (requiere token)")
    app.run(debug=True, host='0.0.0.0', port=5000)
