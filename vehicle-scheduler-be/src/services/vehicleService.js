const axiosInstance = require('../config/axiosConfig');

/**
 * Fetches vehicles/tasks for a specific depot and standardizes the structure.
 * @param {string} token Bearer token for authorization
 * @param {number} depotId The ID of the depot to filter vehicles for
 * @returns {Promise<Array>} List of standardized vehicle task objects
 */
async function getVehicles(token, depotId) {
  try {
    // Attempt to query with depotId parameter.
    // If the API supports other names, we pass both for maximum compatibility.
    const response = await axiosInstance.get('/vehicles', {
      params: {
        depotId: depotId,
        depot: depotId
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.data || !Array.isArray(response.data.vehicles)) {
      throw new Error('Upstream API response is missing vehicles list or has invalid format');
    }

    // Map and sanitize the task structures.
    // Supporting different naming conventions (e.g. TaskID/TaskId, Impact/Score/Priority, Duration)
    return response.data.vehicles.map(v => {
      const taskId = v.TaskID || v.TaskId || v.taskId || v.id;
      const duration = v.Duration !== undefined ? v.Duration : (v.duration !== undefined ? v.duration : v.hours);
      // Maximized value is referred to as Score, Priority or Impact (API returned Impact)
      const score = v.Impact !== undefined ? v.Impact : (v.Score !== undefined ? v.Score : (v.score !== undefined ? v.score : (v.Priority !== undefined ? v.Priority : v.priority)));
      const vDepotId = v.DepotID !== undefined ? v.DepotID : (v.depotId !== undefined ? v.depotId : (v.Depot !== undefined ? v.Depot : (v.depot !== undefined ? v.depot : depotId)));

      if (!taskId || duration === undefined || score === undefined) {
        throw new Error(`Invalid vehicle task structure detected: ${JSON.stringify(v)}`);
      }

      return {
        taskId: String(taskId),
        duration: Number(duration),
        score: Number(score),
        depotId: Number(vDepotId)
      };
    });

  } catch (error) {
    if (error.response) {
      const errorMsg = error.response.data ? JSON.stringify(error.response.data) : error.message;
      const status = error.response.status;
      const customErr = new Error(`External vehicles service failed with status ${status}: ${errorMsg}`);
      customErr.status = status;
      throw customErr;
    }
    throw error;
  }
}

module.exports = {
  getVehicles
};
