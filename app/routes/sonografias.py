from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import psycopg2
import os

bp = Blueprint('sonografias', __name__)

def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))

@bp.route('/', methods=['GET'])
@jwt_required()
def listar_sonografias():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Primero verificar qué columnas tiene la tabla
        cur.execute("SELECT * FROM sonografias LIMIT 0")
        columnas = [desc[0] for desc in cur.description]
        
        # Construir query según columnas disponibles
        cur.execute("SELECT * FROM sonografias ORDER BY id DESC LIMIT 100")
        sonografias = []
        for row in cur.fetchall():
            sonografias.append({columnas[i]: row[i] for i in range(len(columnas))})
        
        cur.close()
        conn.close()
        return jsonify(sonografias), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/tipos', methods=['GET'])
@jwt_required()
def listar_tipos():
    tipos = ['Sonografía Abdominal', 'Sonografía Pélvica', 'Sonografía Obstétrica']
    return jsonify(tipos), 200
