from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import psycopg2
import os
import bcrypt

bp = Blueprint('admin_usuarios', __name__)

def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))

@bp.route('/usuarios', methods=['GET'])
@jwt_required()
def listar_usuarios():
    """Listar todos los usuarios"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, username, nombre, apellido, email, rol, activo, created_at
            FROM usuarios
            ORDER BY id
        """)
        
        usuarios = []
        for row in cur.fetchall():
            usuarios.append({
                'id': row[0],
                'username': row[1],
                'nombre': row[2],
                'apellido': row[3],
                'email': row[4],
                'rol': row[5],
                'activo': row[6],
                'created_at': row[7].isoformat() if row[7] else None
            })
        
        cur.close()
        conn.close()
        
        return jsonify({'success': True, 'data': usuarios}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/usuarios', methods=['POST'])
@jwt_required()
def crear_usuario():
    """Crear nuevo usuario"""
    try:
        data = request.json
        
        if not all(k in data for k in ['username', 'password', 'nombre', 'rol']):
            return jsonify({'error': 'Faltan campos requeridos'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Verificar si username existe
        cur.execute("SELECT id FROM usuarios WHERE username = %s", (data['username'],))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'error': 'Username ya existe'}), 400
        
        # Hash password
        password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cur.execute("""
            INSERT INTO usuarios (username, password_hash, nombre, apellido, email, rol, activo)
            VALUES (%s, %s, %s, %s, %s, %s, true)
            RETURNING id
        """, (
            data['username'],
            password_hash,
            data['nombre'],
            data.get('apellido', ''),
            data.get('email', ''),
            data['rol']
        ))
        
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Usuario creado', 'id': user_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/usuarios/<int:user_id>', methods=['PUT'])
@jwt_required()
def actualizar_usuario(user_id):
    """Actualizar usuario"""
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id FROM usuarios WHERE id = %s", (user_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        cur.execute("""
            UPDATE usuarios 
            SET nombre = COALESCE(%s, nombre),
                apellido = COALESCE(%s, apellido),
                email = COALESCE(%s, email),
                rol = COALESCE(%s, rol),
                activo = COALESCE(%s, activo),
                updated_at = NOW()
            WHERE id = %s
        """, (
            data.get('nombre'),
            data.get('apellido'),
            data.get('email'),
            data.get('rol'),
            data.get('activo'),
            user_id
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Usuario actualizado'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/usuarios/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
def reset_password(user_id):
    """Cambiar contraseña"""
    try:
        data = request.json
        new_password = data.get('new_password')
        
        if not new_password:
            return jsonify({'error': 'new_password requerido'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cur.execute("""
            UPDATE usuarios 
            SET password_hash = %s, updated_at = NOW()
            WHERE id = %s
        """, (password_hash, user_id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Contraseña actualizada'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/usuarios/<int:user_id>/toggle', methods=['POST'])
@jwt_required()
def toggle_usuario(user_id):
    """Activar/Desactivar usuario"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE usuarios 
            SET activo = NOT activo, updated_at = NOW()
            WHERE id = %s
            RETURNING activo
        """, (user_id,))
        
        nuevo_estado = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Estado actualizado', 'activo': nuevo_estado}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/roles', methods=['GET'])
@jwt_required()
def listar_roles():
    """Listar roles disponibles - CORREGIDO para coincidir con BD"""
    roles = [
        {'value': 'admin', 'label': 'Administrador'},
        {'value': 'medico', 'label': 'Médico'},
        {'value': 'recepcion', 'label': 'Recepcionista'},
        {'value': 'tecnico', 'label': 'Técnico/Laboratorista'},
        {'value': 'cajero', 'label': 'Cajero'}
    ]
    return jsonify(roles), 200
