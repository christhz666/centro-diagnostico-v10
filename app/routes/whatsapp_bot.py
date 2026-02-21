from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import psycopg2
import os

bp = Blueprint('whatsapp_bot', __name__)

def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))

@bp.route('/historial', methods=['GET'])
@jwt_required()
def historial_mensajes():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, telefono, mensaje_enviado, fecha FROM whatsapp_messages ORDER BY fecha DESC LIMIT 50")
        mensajes = [{'id': r[0], 'telefono': r[1], 'mensaje': r[2], 'fecha': r[3].isoformat() if r[3] else None} for r in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify(mensajes), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/enviar', methods=['POST'])
@jwt_required()
def enviar_mensaje():
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("INSERT INTO whatsapp_messages (telefono, mensaje_enviado, fecha, enviado_por_sistema) VALUES (%s, %s, NOW(), true) RETURNING id", (data['telefono'], data['mensaje']))
        msg_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'id': msg_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
