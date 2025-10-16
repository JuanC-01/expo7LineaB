const express = require('express');
const router = express.Router();
const { getHidrografia } = require('../controllers/hidrografiaController');

router.get('/', getHidrografia);

module.exports = router