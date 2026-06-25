const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const axiosInstance = axios.create({
  baseURL: process.env.BASE_URL || 'http://4.224.186.213/evaluation-service',
  timeout: parseInt(process.env.AXIOS_TIMEOUT || '10000', 10),
  headers: {
    'Content-Type': 'application/json'
  }
});

module.exports = axiosInstance;
