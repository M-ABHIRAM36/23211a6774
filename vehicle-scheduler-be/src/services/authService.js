const axiosInstance = require('../config/axiosConfig');

async function getToken() {
  const payload = {
    email: process.env.EMAIL,
    name: process.env.NAME,
    rollNo: process.env.ROLL_NO,
    accessCode: process.env.ACCESS_CODE,
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
  };

  const response = await axiosInstance.post('/auth', payload);
  return response.data.access_token;
}

module.exports = {
  getToken
};
