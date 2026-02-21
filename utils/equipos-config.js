// Configuraciones predefinidas para los equipos del laboratorio

const configuracionesEquipos = {
  // 1. MINDRAY BS-200 (Química Clínica)
  'mindray-bs200': {
    nombre: 'Mindray BS-200',
    marca: 'Mindray',
    modelo: 'BS-200',
    tipo: 'quimica',
    protocolo: 'ASTM',
    configuracion: {
      puerto: 'COM1', // Ajustar según instalación
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    },
    mapeoParametros: [
      // Glucosa
      { codigoEquipo: 'GLU', nombreParametro: 'Glucosa', unidad: 'mg/dL', valorReferencia: '70-100', factor: 1, decimales: 2 },
      // Urea
      { codigoEquipo: 'UREA', nombreParametro: 'Urea', unidad: 'mg/dL', valorReferencia: '15-40', factor: 1, decimales: 2 },
      // Creatinina
      { codigoEquipo: 'CREA', nombreParametro: 'Creatinina', unidad: 'mg/dL', valorReferencia: '0.6-1.2', factor: 1, decimales: 2 },
      // Ácido Úrico
      { codigoEquipo: 'UA', nombreParametro: 'Ácido Úrico', unidad: 'mg/dL', valorReferencia: '3.5-7.2', factor: 1, decimales: 2 },
      // Colesterol Total
      { codigoEquipo: 'CHOL', nombreParametro: 'Colesterol Total', unidad: 'mg/dL', valorReferencia: '<200', factor: 1, decimales: 2 },
      // Triglicéridos
      { codigoEquipo: 'TRIG', nombreParametro: 'Triglicéridos', unidad: 'mg/dL', valorReferencia: '<150', factor: 1, decimales: 2 },
      // HDL
      { codigoEquipo: 'HDL', nombreParametro: 'HDL Colesterol', unidad: 'mg/dL', valorReferencia: '>40', factor: 1, decimales: 2 },
      // LDL
      { codigoEquipo: 'LDL', nombreParametro: 'LDL Colesterol', unidad: 'mg/dL', valorReferencia: '<100', factor: 1, decimales: 2 },
      // AST (TGO)
      { codigoEquipo: 'AST', nombreParametro: 'AST (TGO)', unidad: 'U/L', valorReferencia: '0-40', factor: 1, decimales: 2 },
      // ALT (TGP)
      { codigoEquipo: 'ALT', nombreParametro: 'ALT (TGP)', unidad: 'U/L', valorReferencia: '0-41', factor: 1, decimales: 2 },
      // Bilirrubina Total
      { codigoEquipo: 'TBIL', nombreParametro: 'Bilirrubina Total', unidad: 'mg/dL', valorReferencia: '0.3-1.2', factor: 1, decimales: 2 },
      // Bilirrubina Directa
      { codigoEquipo: 'DBIL', nombreParametro: 'Bilirrubina Directa', unidad: 'mg/dL', valorReferencia: '0-0.3', factor: 1, decimales: 2 },
      // Proteínas Totales
      { codigoEquipo: 'TP', nombreParametro: 'Proteínas Totales', unidad: 'g/dL', valorReferencia: '6.4-8.3', factor: 1, decimales: 2 },
      // Albúmina
      { codigoEquipo: 'ALB', nombreParametro: 'Albúmina', unidad: 'g/dL', valorReferencia: '3.5-5.0', factor: 1, decimales: 2 }
    ]
  },

  // 2. MINDRAY BC-6800 (Hematología)
  'mindray-bc6800': {
    nombre: 'Mindray BC-6800',
    marca: 'Mindray',
    modelo: 'BC-6800',
    tipo: 'hematologia',
    protocolo: 'ASTM',
    configuracion: {
      puerto: 'COM2',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    },
    mapeoParametros: [
      // Glóbulos Blancos
      { codigoEquipo: 'WBC', nombreParametro: 'Leucocitos (WBC)', unidad: '10³/µL', valorReferencia: '4.0-10.0', factor: 1, decimales: 2 },
      // Glóbulos Rojos
      { codigoEquipo: 'RBC', nombreParametro: 'Eritrocitos (RBC)', unidad: '106/µL', valorReferencia: '4.5-5.5', factor: 1, decimales: 2 },
      // Hemoglobina
      { codigoEquipo: 'HGB', nombreParametro: 'Hemoglobina (HGB)', unidad: 'g/dL', valorReferencia: '13.0-17.0', factor: 1, decimales: 2 },
      // Hematocrito
      { codigoEquipo: 'HCT', nombreParametro: 'Hematocrito (HCT)', unidad: '%', valorReferencia: '40-50', factor: 1, decimales: 2 },
      // VCM
      { codigoEquipo: 'MCV', nombreParametro: 'VCM', unidad: 'fL', valorReferencia: '80-100', factor: 1, decimales: 2 },
      // HCM
      { codigoEquipo: 'MCH', nombreParametro: 'HCM', unidad: 'pg', valorReferencia: '27-33', factor: 1, decimales: 2 },
      // CHCM
      { codigoEquipo: 'MCHC', nombreParametro: 'CHCM', unidad: 'g/dL', valorReferencia: '32-36', factor: 1, decimales: 2 },
      // Plaquetas
      { codigoEquipo: 'PLT', nombreParametro: 'Plaquetas (PLT)', unidad: '10³/µL', valorReferencia: '150-400', factor: 1, decimales: 2 },
      // Neutrófilos
      { codigoEquipo: 'NEUT', nombreParametro: 'Neutrófilos', unidad: '%', valorReferencia: '40-70', factor: 1, decimales: 2 },
      // Linfocitos
      { codigoEquipo: 'LYMPH', nombreParametro: 'Linfocitos', unidad: '%', valorReferencia: '20-40', factor: 1, decimales: 2 },
      // Monocitos
      { codigoEquipo: 'MONO', nombreParametro: 'Monocitos', unidad: '%', valorReferencia: '2-8', factor: 1, decimales: 2 },
      // Eosinófilos
      { codigoEquipo: 'EOS', nombreParametro: 'Eosinófilos', unidad: '%', valorReferencia: '1-4', factor: 1, decimales: 2 },
      // Basófilos
      { codigoEquipo: 'BASO', nombreParametro: 'Basófilos', unidad: '%', valorReferencia: '0-1', factor: 1, decimales: 2 }
    ]
  },

  // 3. ABX MICROS 60 (Hematología Básica)
  'abx-micros60': {
    nombre: 'ABX Micros 60',
    marca: 'Horiba ABX',
    modelo: 'Micros 60',
    tipo: 'hematologia',
    protocolo: 'SERIAL',
    configuracion: {
      puerto: 'COM3',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    },
    mapeoParametros: [
      { codigoEquipo: 'WBC', nombreParametro: 'Leucocitos', unidad: '10³/µL', valorReferencia: '4.0-10.0', factor: 1, decimales: 2 },
      { codigoEquipo: 'RBC', nombreParametro: 'Eritrocitos', unidad: '106/µL', valorReferencia: '4.5-5.5', factor: 1, decimales: 2 },
      { codigoEquipo: 'HGB', nombreParametro: 'Hemoglobina', unidad: 'g/dL', valorReferencia: '13.0-17.0', factor: 1, decimales: 2 },
      { codigoEquipo: 'HCT', nombreParametro: 'Hematocrito', unidad: '%', valorReferencia: '40-50', factor: 1, decimales: 2 },
      { codigoEquipo: 'PLT', nombreParametro: 'Plaquetas', unidad: '10³/µL', valorReferencia: '150-400', factor: 1, decimales: 2 }
    ]
  },

  // 4. DET D20 CEM (Coagulación)
  'det-d20': {
    nombre: 'DET D20 CEM',
    marca: 'DET',
    modelo: 'D20',
    tipo: 'coagulacion',
    protocolo: 'SERIAL',
    configuracion: {
      puerto: 'COM4',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    },
    mapeoParametros: [
      { codigoEquipo: 'PT', nombreParametro: 'Tiempo de Protrombina (PT)', unidad: 'seg', valorReferencia: '11-13.5', factor: 1, decimales: 1 },
      { codigoEquipo: 'INR', nombreParametro: 'INR', unidad: '', valorReferencia: '0.8-1.2', factor: 1, decimales: 2 },
      { codigoEquipo: 'APTT', nombreParametro: 'APTT', unidad: 'seg', valorReferencia: '25-35', factor: 1, decimales: 1 },
      { codigoEquipo: 'FIB', nombreParametro: 'Fibrinógeno', unidad: 'mg/dL', valorReferencia: '200-400', factor: 1, decimales: 2 }
    ]
  },

  // 5. SD BIOSENSOR F200 CEM (Inmunología)
  'sd-biosensor-f200': {
    nombre: 'SD BIOSENSOR F200 CEM',
    marca: 'SD BIOSENSOR',
    modelo: 'F200',
    tipo: 'inmunologia',
    protocolo: 'FILE',
    configuracion: {
      rutaArchivos: '/var/lab/resultados/f200',
      patron: '*.txt'
    },
    mapeoParametros: [
      { codigoEquipo: 'CRP', nombreParametro: 'Proteína C Reactiva', unidad: 'mg/L', valorReferencia: '<5', factor: 1, decimales: 2 },
      { codigoEquipo: 'PCT', nombreParametro: 'Procalcitonina', unidad: 'ng/mL', valorReferencia: '<0.5', factor: 1, decimales: 3 },
      { codigoEquipo: 'TROPONIN', nombreParametro: 'Troponina I', unidad: 'ng/mL', valorReferencia: '<0.04', factor: 1, decimales: 3 },
      { codigoEquipo: 'DIMER', nombreParametro: 'Dímero D', unidad: 'µg/mL', valorReferencia: '<0.5', factor: 1, decimales: 2 }
    ]
  },

  // 6. DAWEI F5 (Sonógrafo - Solo registro manual)
  'dawei-f5': {
    nombre: 'DAWEI F5 Sonógrafo',
    marca: 'DAWEI',
    modelo: 'F5',
    tipo: 'otro',
    protocolo: 'FILE',
    configuracion: {
      rutaArchivos: '/var/lab/imagenes/sonografo',
      patron: '*.dcm'
    },
    mapeoParametros: []
  }
};

module.exports = configuracionesEquipos;
