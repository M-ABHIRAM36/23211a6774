const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const axiosInstance = axios.create({
  baseURL: process.env.BASE_URL || 'http://4.224.186.213/evaluation-service'
});

module.exports = axiosInstance;
