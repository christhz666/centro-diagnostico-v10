from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from datetime import timedelta

auth_bp = Blueprint('auth', __name__)

# Usuarios de prueba
USERS = {
    'admin': {'password': 'admin123', 'nombre': 'Administrador', 'email': 'admin@centro.com', 'rol': 'admin'},
    'doctor': {'password': 'doctor123', 'nombre': 'Doctor', 'email': 'doctor@centro.com', 'rol': 'medico'},
    'lab': {'password': 'lab123', 'nombre': 'Laboratorio', 'email': 'lab@centro.com', 'rol': 'lab'}
}

@auth_bp.route('/login', methods=['POST'])
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
    refresh_token = create_refresh_token(identity=username)
    
    return jsonify({
        'success': True,
        'access_token': access_token,
        'refresh_token': refresh_token,
        'usuario': {'username': username, 'nombre': user['nombre'], 'email': user['email'], 'rol': user['rol']}
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity, expires_delta=timedelta(hours=8))
    return jsonify({'access_token': access_token}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    identity = get_jwt_identity()
    user = USERS.get(identity)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'username': identity, 'nombre': user['nombre'], 'email': user['email'], 'rol': user['rol']}), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'message': 'Logged out'}), 200
