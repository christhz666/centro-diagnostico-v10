from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import psycopg2
import os

bp = Blueprint('estudios', __name__)

def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))

@bp.route('/', methods=['GET'])
@jwt_required()
def listar_estudios():
    """Listar todos los estudios"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                e.id, 
                e.codigo, 
                e.nombre, 
                e.precio, 
                e.categoria_id,
                c.nombre as categoria_nombre,
                e.activo
            FROM estudios e
            LEFT JOIN categorias c ON e.categoria_id = c.id
            ORDER BY e.nombre
        """)
        
        estudios = []
        for row in cur.fetchall():
            estudios.append({
                'id': row[0],
                'codigo': row[1],
                'nombre': row[2],
                'precio': float(row[3]) if row[3] else 0,
                'categoria_id': row[4],
                'categoria': row[5],
                'activo': row[6]
            })
        
        cur.close()
        conn.close()
        
        return jsonify(estudios), 200
    except Exception as e:
        print(f"Error en listar_estudios: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@bp.route('/', methods=['POST'])
@jwt_required()
def crear_estudio():
    """Crear nuevo estudio"""
    try:
        data = request.json
        
        if not all(k in data for k in ['codigo', 'nombre', 'precio']):
            return jsonify({'error': 'Faltan campos requeridos'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Verificar si código existe
        cur.execute("SELECT id FROM estudios WHERE codigo = %s", (data['codigo'],))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'error': 'Código ya existe'}), 400
        
        cur.execute("""
            INSERT INTO estudios (codigo, nombre, descripcion, precio, categoria_id, activo)
            VALUES (%s, %s, %s, %s, %s, true)
            RETURNING id
        """, (
            data['codigo'],
            data['nombre'],
            data.get('descripcion', ''),
            data['precio'],
            data.get('categoria_id')
        ))
        
        estudio_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Estudio creado', 'id': estudio_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:estudio_id>', methods=['PUT'])
@jwt_required()
def actualizar_estudio(estudio_id):
    """Actualizar estudio"""
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id FROM estudios WHERE id = %s", (estudio_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Estudio no encontrado'}), 404
        
        cur.execute("""
            UPDATE estudios 
            SET codigo = COALESCE(%s, codigo),
                nombre = COALESCE(%s, nombre),
                descripcion = COALESCE(%s, descripcion),
                precio = COALESCE(%s, precio),
                categoria_id = COALESCE(%s, categoria_id),
                activo = COALESCE(%s, activo),
                updated_at = NOW()
            WHERE id = %s
        """, (
            data.get('codigo'),
            data.get('nombre'),
            data.get('descripcion'),
            data.get('precio'),
            data.get('categoria_id'),
            data.get('activo'),
            estudio_id
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Estudio actualizado'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:estudio_id>', methods=['DELETE'])
@jwt_required()
def eliminar_estudio(estudio_id):
    """Eliminar (desactivar) estudio"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE estudios 
            SET activo = false, updated_at = NOW()
            WHERE id = %s
        """, (estudio_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Estudio desactivado'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/categorias', methods=['GET'])
@jwt_required()
def listar_categorias():
    """Listar categorías"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id, nombre, descripcion FROM categorias WHERE activo = true ORDER BY nombre")
        
        categorias = []
        for row in cur.fetchall():
            categorias.append({
                'id': row[0],
                'nombre': row[1],
                'descripcion': row[2]
            })
        
        cur.close()
        conn.close()
        
        return jsonify(categorias), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/precios', methods=['GET'])
@jwt_required()
def listar_precios():
    """Listar precios para facturación"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, codigo, nombre, precio
            FROM estudios
            WHERE activo = true
            ORDER BY nombre
        """)
        
        estudios = []
        for row in cur.fetchall():
            estudios.append({
                'id': row[0],
                'codigo': row[1],
                'nombre': row[2],
                'precio': float(row[3]) if row[3] else 0
            })
        
        cur.close()
        conn.close()
        
        return jsonify(estudios), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
