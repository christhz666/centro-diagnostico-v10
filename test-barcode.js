const bwipjs = require('bwip-js');
const fs = require('fs');

bwipjs.toBuffer({
    bcid: 'code128',
    text: 'FAC-PIA-001',
    scale: 3,
    height: 10,
    includetext: true,
    textxalign: 'center',
}, function (err, png) {
    if (err) {
        console.error("Error al generar barcode:", err);
        process.exit(1);
    }
    fs.writeFileSync('test-barcode.png', png);
    console.log('EXITO: Barcode generado en test-barcode.png');
});
