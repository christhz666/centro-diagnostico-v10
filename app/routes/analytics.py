from flask import Blueprint, jsonify, request
from functools import wraps
import psycopg2
import os
from datetime import datetime, timedelta

analytics_bp = Blueprint('analytics', __name__)

def get_db_connection():
    """Obtener conexión a la base de datos"""
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    return conn

def require_auth(f):
    """Decorador para requerir autenticación"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Aquí iría la verificación JWT real
        return f(*args, **kwargs)
    return decorated_function

@analytics_bp.route('/dashboard-completo', methods=['GET'])
@require_auth
def dashboard_completo():
    """Dashboard ejecutivo con todas las métricas"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # KPIs principales
        cur.execute("""
            SELECT 
                (SELECT COUNT(*) FROM pacientes) as total_pacientes,
                (SELECT COUNT(*) FROM ordenes WHERE estado = 'pendiente') as ordenes_pendientes,
                (SELECT COUNT(*) FROM facturas WHERE estado IN ('pendiente', 'parcial')) as facturas_pendientes,
                (SELECT COALESCE(SUM(total), 0) FROM facturas WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE) AND estado = 'pagada') as ventas_mes
        """)
        dashboard = cur.fetchone()
        
        # Ingresos mensuales (últimos 6 meses)
        cur.execute("""
            SELECT 
                TO_CHAR(fecha, 'Mon YYYY') as mes,
                COALESCE(SUM(total), 0) as ingresos
            FROM facturas
            WHERE fecha >= CURRENT_DATE - INTERVAL '6 months'
            AND estado = 'pagada'
            GROUP BY DATE_TRUNC('month', fecha), TO_CHAR(fecha, 'Mon YYYY')
            ORDER BY DATE_TRUNC('month', fecha)
        """)
        ingresos_mensuales = [{'mes': row[0], 'ingresos': float(row[1])} for row in cur.fetchall()]
        
        # Top estudios
        cur.execute("""
            SELECT e.nombre, COUNT(*) as cantidad
            FROM orden_detalles od
            JOIN estudios e ON od.estudio_id = e.id
            JOIN ordenes o ON od.orden_id = o.id
            WHERE o.fecha >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY e.nombre
            ORDER BY cantidad DESC
            LIMIT 10
        """)
        top_estudios = [{'nombre': row[0], 'cantidad': row[1]} for row in cur.fetchall()]
        
        cur.close()
        conn.close()
        
        return jsonify({
            'dashboard': {
                'total_pacientes': dashboard[0],
                'ordenes_pendientes': dashboard[1],
                'facturas_pendientes': dashboard[2],
                'ventas_mes': float(dashboard[3])
            },
            'ingresos_mensuales': ingresos_mensuales,
            'top_estudios': top_estudios
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/estadisticas-diarias', methods=['GET'])
@require_auth
def estadisticas_diarias():
    """Estadísticas de los últimos 30 días"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                fecha::date,
                COUNT(DISTINCT CASE WHEN tabla = 'pacientes' THEN id END) as pacientes_nuevos,
                COUNT(DISTINCT CASE WHEN tabla = 'ordenes' THEN id END) as ordenes_creadas,
                COUNT(DISTINCT CASE WHEN tabla = 'facturas' THEN id END) as facturas_generadas
            FROM (
                SELECT id, fecha_registro as fecha, 'pacientes' as tabla FROM pacientes
                WHERE fecha_registro >= CURRENT_DATE - INTERVAL '30 days'
                UNION ALL
                SELECT id, fecha, 'ordenes' as tabla FROM ordenes
                WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
                UNION ALL
                SELECT id, fecha, 'facturas' as tabla FROM facturas
                WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
            ) combined
            GROUP BY fecha::date
            ORDER BY fecha::date DESC
            LIMIT 30
        """)
        
        estadisticas = [
            {
                'fecha': row[0].strftime('%Y-%m-%d'),
                'pacientes': row[1],
                'ordenes': row[2],
                'facturas': row[3]
            }
            for row in cur.fetchall()
        ]
        
        cur.close()
        conn.close()
        
        return jsonify(estadisticas), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
