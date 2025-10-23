const express = require('express');
const { findEquipamientosByIntersection, findEquipamientosByBuffer } = require('../controllers/consultasController'); // Ajusta ruta

const router = express.Router();

router.post('/interseccion', findEquipamientosByIntersection);

router.post('/buffer', findEquipamientosByBuffer);

module.exports = router;