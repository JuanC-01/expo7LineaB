const express = require('express');
const router = express.Router();
const equipamientosController = require('../controllers/equipamientosController'); 

router.get('/', equipamientosController.getEquipamientos);

router.post('/', equipamientosController.createEquipamiento);

router.put('/:gid', equipamientosController.updateEquipamiento);

router.delete('/:gid', equipamientosController.deleteEquipamiento);

module.exports = router;