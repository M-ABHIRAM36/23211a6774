const axiosInstance = require('../config/axiosConfig');

async function getDepots(token) {
  const response = await axiosInstance.get('/depots', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data.depots;
}

module.exports = {
  getDepots
};
