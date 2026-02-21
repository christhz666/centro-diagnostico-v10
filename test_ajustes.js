const mongoose = require('mongoose');
require('dotenv').config();
const Estudio = require('./models/Estudio');
const Factura = require('./models/Factura');
const Paciente = require('./models/Paciente');
const Resultado = require('./models/Resultado');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

        // Buscar resultado de cristopher
        const estImgId = (await mongoose.model('Estudio').findOne({ nombre: /Rayo/i }))._id;
        const pacId = (await mongoose.model('Paciente').findOne({ nombre: /cristopher/i }))._id;
        const resultado = await Resultado.findOne({ paciente: pacId, estudio: estImgId });

        if (resultado) {
            console.log('--- REPORTE ANTES DEL UPDATE ---');
            console.log(JSON.stringify(resultado.imagenologia, null, 2));

            // Simular guardado de ajustes desde la API
            resultado.imagenologia = resultado.imagenologia || {};
            resultado.imagenologia.ajustesVisor = { ww: 1500, wc: -600, zoom: '1.50', invertido: true };

            await resultado.save();
            console.log('\n--- GUARDADO SIMULADO OK ---');

            const res2 = await Resultado.findById(resultado._id);
            console.log(JSON.stringify(res2.imagenologia, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
