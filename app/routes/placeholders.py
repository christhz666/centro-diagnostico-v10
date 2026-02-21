# TODO: Implementar rutas de pacientes, estudios, ordenes, resultados, reportes
# Estos módulos se implementarán en fases posteriores

from flask import Blueprint

bp_pacientes = Blueprint('pacientes', __name__)
bp_estudios = Blueprint('estudios', __name__)
bp_ordenes = Blueprint('ordenes', __name__)
bp_resultados = Blueprint('resultados', __name__)
bp_reportes = Blueprint('reportes', __name__)
