from flask import request
from app import db
from sqlalchemy import text
from datetime import datetime
import json


def registrar_auditoria(usuario_id, accion, tabla, registro_id, datos_antes=None, datos_despues=None):
    """Registrar acción en tabla de auditoría"""
    try:
        ip = request.headers.get('X-Real-IP', request.remote_addr) if request else None
        user_agent = request.headers.get('User-Agent', '')[:200] if request else None

        db.session.execute(text("""
            INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos, ip_address, user_agent, created_at)
            VALUES (:tabla, :registro_id, :accion, :usuario_id, :datos_antes, :datos_despues, :ip, :ua, :now)
        """), {
            'tabla': tabla,
            'registro_id': registro_id,
            'accion': accion,
            'usuario_id': usuario_id,
            'datos_antes': json.dumps(datos_antes) if datos_antes else None,
            'datos_despues': json.dumps(datos_despues) if datos_despues else None,
            'ip': ip,
            'ua': user_agent,
            'now': datetime.utcnow()
        })
        db.session.commit()
    except Exception as e:
        print(f"Error auditoría: {e}")


def obtener_auditoria(tabla=None, registro_id=None, limit=50):
    """Obtener registros de auditoría"""
    query = "SELECT a.*, u.username FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id WHERE 1=1"
    params = {}

    if tabla:
        query += " AND a.tabla = :tabla"
        params['tabla'] = tabla
    if registro_id:
        query += " AND a.registro_id = :registro_id"
        params['registro_id'] = registro_id

    query += " ORDER BY a.created_at DESC LIMIT :limit"
    params['limit'] = limit

    result = db.session.execute(text(query), params)
    rows = result.fetchall()

    return [{
        'id': row[0],
        'tabla': row[1],
        'registro_id': row[2],
        'accion': row[3],
        'usuario_id': row[4],
        'datos_anteriores': row[5],
        'datos_nuevos': row[6],
        'ip': row[7],
        'user_agent': row[8],
        'fecha': row[9].isoformat() if row[9] else None,
        'username': row[-1]
    } for row in rows]
