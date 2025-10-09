require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const lineasRoutes = require('./routes/lineas');
const barriosRoutes = require('./routes/barrios');

// Registrar rutas con prefijos
app.use('/api/lineas', lineasRoutes);
app.use('/api/barrios', barriosRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
