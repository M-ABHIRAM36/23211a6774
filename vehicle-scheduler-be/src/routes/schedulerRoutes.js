const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/schedulerController');

router.get('/schedule', schedulerController.getSchedule);

module.exports = router;
