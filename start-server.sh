#!/bin/bash

cd ~/centro-diagnostico/backend

echo "?? Deteniendo procesos anteriores..."
pkill -9 -f "node.*server.js" 2>/dev/null
sleep 2

echo "?? Limpiando logs..."
> logs/backend.log 2>/dev/null || mkdir -p logs

echo "?? Iniciando servidor..."
nohup node server.js > logs/backend.log 2>&1 &

sleep 5

if pgrep -f "node.*server.js" > /dev/null; then
    PID=$(pgrep -f "node.*server.js")
    echo ""
    echo "? SERVIDOR INICIADO"
    echo "   PID: $PID"
    echo "   Puerto: 5000"
    echo ""
    echo "?? Ver logs:"
    echo "   tail -f logs/backend.log"
    echo ""
    echo "?? Detener:"
    echo "   pkill -f 'node.*server.js'"
    echo ""
    
    # Probar API
    sleep 2
    echo "?? Probando API..."
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        echo "   ? API respondiendo"
    else
        echo "   ??  API no responde aún, espere unos segundos"
    fi
else
    echo ""
    echo "? ERROR AL INICIAR"
    echo ""
    echo "Ver logs de error:"
    tail -30 logs/backend.log
fi
