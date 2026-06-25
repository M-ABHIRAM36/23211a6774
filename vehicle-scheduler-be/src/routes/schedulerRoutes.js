const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/schedulerController');

// Route to get optimized schedule
router.get('/schedule', schedulerController.getSchedule);

module.exports = router;
