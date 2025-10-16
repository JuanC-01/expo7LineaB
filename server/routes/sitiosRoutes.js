
const express = require('express');
const router = express.Router();
const {
    getSitios,
    createSitio,
    updateSitio,
    deleteSitio
} = require('../controllers/sitiosController');

router.get('/all', getSitios);
router.post('/', createSitio);      
router.put('/:id', updateSitio);    
router.delete('/:id', deleteSitio);

module.exports = router;