const express = require('express');
const cors = require('cors');
const schedulerRoutes = require('./routes/schedulerRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', schedulerRoutes);

module.exports = app;
