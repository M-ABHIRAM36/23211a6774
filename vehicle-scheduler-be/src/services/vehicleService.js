const axiosInstance = require('../config/axiosConfig');

async function getVehicles(token, depotId) {
  const response = await axiosInstance.get('/vehicles', {
    params: { depotId },
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data.vehicles.map(v => ({
    taskId: v.TaskID || v.TaskId,
    duration: v.Duration || v.duration,
    score: v.Impact || v.Score || v.score
  }));
}

module.exports = {
  getVehicles
};
