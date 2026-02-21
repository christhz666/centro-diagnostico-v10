from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
import psycopg2
import os
from datetime import datetime, timedelta

bp = Blueprint('dashboard', __name__)

def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))

@bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Total de pacientes
        cur.execute("SELECT COUNT(*) FROM pacientes")
        total_pacientes = cur.fetchone()[0] or 0
        
        # Pacientes nuevos este mes
        cur.execute("""
            SELECT COUNT(*) FROM pacientes 
            WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
        """)
        nuevos_mes = cur.fetchone()[0] or 0
        
        # Citas de hoy (órdenes de hoy)
        cur.execute("""
            SELECT COUNT(*) FROM ordenes 
            WHERE DATE(fecha_orden) = CURRENT_DATE
        """)
        citas_hoy = cur.fetchone()[0] or 0
        
        # Citas completadas hoy
        cur.execute("""
            SELECT COUNT(*) FROM ordenes 
            WHERE DATE(fecha_orden) = CURRENT_DATE 
            AND estado = 'completada'
        """)
        completadas_hoy = cur.fetchone()[0] or 0
        
        # Resultados pendientes
        cur.execute("""
            SELECT COUNT(*) FROM resultados 
            WHERE estado_validacion = 'pendiente'
        """)
        resultados_pendientes = cur.fetchone()[0] or 0
        
        # Resultados completados este mes
        cur.execute("""
            SELECT COUNT(*) FROM resultados 
            WHERE DATE_TRUNC('month', fecha_validacion) = DATE_TRUNC('month', CURRENT_DATE)
            AND estado_validacion = 'validado'
        """)
        resultados_completados = cur.fetchone()[0] or 0
        
        # Facturación de hoy
        cur.execute("""
            SELECT COALESCE(SUM(total), 0), COUNT(*) 
            FROM facturas 
            WHERE DATE(fecha_factura) = CURRENT_DATE
        """)
        row = cur.fetchone()
        facturacion_hoy_total = float(row[0] or 0)
        facturacion_hoy_cantidad = row[1] or 0
        
        # Facturación del mes
        cur.execute("""
            SELECT COALESCE(SUM(total), 0), COUNT(*) 
            FROM facturas 
            WHERE DATE_TRUNC('month', fecha_factura) = DATE_TRUNC('month', CURRENT_DATE)
        """)
        row = cur.fetchone()
        facturacion_mes_total = float(row[0] or 0)
        facturacion_mes_cantidad = row[1] or 0
        
        cur.close()
        conn.close()
        
        # Formato exacto que espera el frontend
        return jsonify({
            'pacientes': {
                'total': total_pacientes,
                'nuevosMes': nuevos_mes
            },
            'citas': {
                'hoy': citas_hoy,
                'completadasHoy': completadas_hoy
            },
            'resultados': {
                'pendientes': resultados_pendientes,
                'completadosMes': resultados_completados
            },
            'facturacion': {
                'hoy': {
                    'total': round(facturacion_hoy_total, 2),
                    'cantidad': facturacion_hoy_cantidad
                },
                'mes': {
                    'total': round(facturacion_mes_total, 2),
                    'cantidad': facturacion_mes_cantidad
                }
            }
        }), 200
        
    except Exception as e:
        print(f"? Error en dashboard stats: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
