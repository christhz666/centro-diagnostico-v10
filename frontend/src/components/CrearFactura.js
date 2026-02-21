import React from 'react';

function CrearFactura() {
  return (
    <div className="container">
      <h1>? Crear Nueva Factura</h1>
      <div className="info-box">
        <p>?? Módulo en desarrollo</p>
        <p>Para crear facturas, primero necesitas:</p>
        <ul>
          <li>Módulo de pacientes (para seleccionar el paciente)</li>
          <li>Módulo de órdenes (para crear la orden de estudios)</li>
          <li>Luego podrás generar la factura desde la orden</li>
        </ul>
        <p><strong>Por ahora</strong>, puedes crear facturas usando la API directamente con Postman.</p>
      </div>
    </div>
  );
}

export default CrearFactura;
