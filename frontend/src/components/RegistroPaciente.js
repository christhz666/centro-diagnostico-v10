import React, { useState } from 'react';
import { FaUserPlus, FaClipboardList } from 'react-icons/fa';
import FormularioPaciente from './FormularioPaciente';
import FormularioOrden from './FormularioOrden';

function RegistroPaciente() {
  const [step, setStep] = useState(1);
  const [pacienteId, setPacienteId] = useState(null);

  const handlePacienteCreado = (id) => {
    setPacienteId(id);
    setStep(2);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">
          <span className="page-title-icon">
            {step === 1 ? <FaUserPlus /> : <FaClipboardList />}
          </span>
          {step === 1 ? 'Registro de Paciente' : 'Crear Orden'}
        </h2>
      </div>

      <div className="stepper">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Paciente</div>
        </div>
        <div className="step-line"></div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Orden</div>
        </div>
      </div>

      {step === 1 && (
        <FormularioPaciente onSuccess={handlePacienteCreado} />
      )}

      {step === 2 && pacienteId && (
        <FormularioOrden 
          pacienteId={pacienteId} 
          onBack={() => setStep(1)}
        />
      )}
    </div>
  );
}

export default RegistroPaciente;
