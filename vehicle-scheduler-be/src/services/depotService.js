const axiosInstance = require('../config/axiosConfig');

/**
 * Fetches depots from the external API.
 * @param {string} token Bearer token for authorization
 * @returns {Promise<Array>} List of standardized depot objects
 */
async function getDepots(token) {
  try {
    const response = await axiosInstance.get('/depots', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.data || !Array.isArray(response.data.depots)) {
      throw new Error('Upstream API response is missing depots list or has invalid format');
    }

    // Standardize depots data format
    return response.data.depots.map(depot => {
      const id = depot.ID !== undefined ? depot.ID : depot.id;
      const hours = depot.MechanicHours !== undefined ? depot.MechanicHours : (depot.mechanicHours !== undefined ? depot.mechanicHours : depot.hours);
      
      if (id === undefined || hours === undefined) {
        throw new Error(`Invalid depot structure detected from API response: ${JSON.stringify(depot)}`);
      }

      return {
        id: Number(id),
        mechanicHours: Number(hours)
      };
    });
  } catch (error) {
    if (error.response) {
      const errorMsg = error.response.data ? JSON.stringify(error.response.data) : error.message;
      const status = error.response.status;
      const customErr = new Error(`External depots service failed with status ${status}: ${errorMsg}`);
      customErr.status = status;
      throw customErr;
    }
    throw error;
  }
}

module.exports = {
  getDepots
};
