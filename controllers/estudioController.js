const Estudio = require('../models/Estudio');

// @desc    Obtener todos los estudios
// @route   GET /api/estudios
exports.getEstudios = async (req, res, next) => {
    try {
        let filter = { activo: true };

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { nombre: searchRegex },
                { codigo: searchRegex }
            ];
        }

        if (req.query.categoria) {
            filter.categoria = req.query.categoria;
        }

        const estudios = await Estudio.find(filter)
            .sort(req.query.sort || 'categoria nombre');

        res.json({
            success: true,
            count: estudios.length,
            data: estudios
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener un estudio
// @route   GET /api/estudios/:id
exports.getEstudio = async (req, res, next) => {
    try {
        const estudio = await Estudio.findById(req.params.id);

        if (!estudio) {
            return res.status(404).json({
                success: false,
                message: 'Estudio no encontrado'
            });
        }

        res.json({ success: true, data: estudio });
    } catch (error) {
        next(error);
    }
};

// @desc    Crear estudio
// @route   POST /api/estudios
exports.createEstudio = async (req, res, next) => {
    try {
        const estudio = await Estudio.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Estudio creado exitosamente',
            data: estudio
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Actualizar estudio
// @route   PUT /api/estudios/:id
exports.updateEstudio = async (req, res, next) => {
    try {
        const estudio = await Estudio.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!estudio) {
            return res.status(404).json({
                success: false,
                message: 'Estudio no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Estudio actualizado',
            data: estudio
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Desactivar estudio
// @route   DELETE /api/estudios/:id
exports.deleteEstudio = async (req, res, next) => {
    try {
        const estudio = await Estudio.findByIdAndUpdate(
            req.params.id,
            { activo: false },
            { new: true }
        );

        if (!estudio) {
            return res.status(404).json({
                success: false,
                message: 'Estudio no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Estudio desactivado'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener categorías disponibles
// @route   GET /api/estudios/categorias
exports.getCategorias = async (req, res, next) => {
    try {
        const categorias = await Estudio.distinct('categoria', { activo: true });
        res.json({
            success: true,
            data: categorias
        });
    } catch (error) {
        next(error);
    }
};
