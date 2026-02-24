const Sucursal = require('../models/Sucursal');

// @desc    Obtener todas las sucursales
// @route   GET /api/sucursales
// @access  Privado
exports.getSucursales = async (req, res, next) => {
    try {
        const sucursales = await Sucursal.find();
        res.status(200).json({
            success: true,
            count: sucursales.length,
            data: sucursales
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener una sola sucursal
// @route   GET /api/sucursales/:id
// @access  Privado
exports.getSucursal = async (req, res, next) => {
    try {
        const sucursal = await Sucursal.findById(req.params.id);
        if (!sucursal) {
            return res.status(404).json({ success: false, error: 'Sucursal no encontrada' });
        }
        res.status(200).json({
            success: true,
            data: sucursal
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Crear nueva sucursal
// @route   POST /api/sucursales
// @access  Privado/Admin
exports.createSucursal = async (req, res, next) => {
    try {
        const sucursal = await Sucursal.create(req.body);
        res.status(201).json({
            success: true,
            data: sucursal
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Actualizar sucursal
// @route   PUT /api/sucursales/:id
// @access  Privado/Admin
exports.updateSucursal = async (req, res, next) => {
    try {
        const sucursal = await Sucursal.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!sucursal) {
            return res.status(404).json({ success: false, error: 'Sucursal no encontrada' });
        }
        res.status(200).json({
            success: true,
            data: sucursal
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Eliminar sucursal
// @route   DELETE /api/sucursales/:id
// @access  Privado/Admin
exports.deleteSucursal = async (req, res, next) => {
    try {
        const sucursal = await Sucursal.findById(req.params.id);
        if (!sucursal) {
            return res.status(404).json({ success: false, error: 'Sucursal no encontrada' });
        }
        await sucursal.deleteOne();
        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};
