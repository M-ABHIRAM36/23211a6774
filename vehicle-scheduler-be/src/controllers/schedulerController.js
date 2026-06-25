const authService = require('../services/authService');
const depotService = require('../services/depotService');
const vehicleService = require('../services/vehicleService');
const knapsackService = require('../services/knapsackService');

/**
 * Endpoint controller for GET /api/schedule
 * Orchestrates fetching depots & vehicles, invoking knapsack solver, and formatting the response.
 */
async function getSchedule(req, res, next) {
  try {
    // 1. Authenticate and obtain Bearer token
    let token;
    try {
      token = await authService.getToken();
    } catch (authError) {
      // Invalidate token cache in case it was a bad cached token
      authService.invalidateToken();
      
      const isMissingConfig = authError.message.includes('Missing required configuration');
      if (isMissingConfig) {
        return res.status(500).json({
          error: "Internal Server Configuration Error",
          message: authError.message
        });
      }

      const status = authError.status || 401;
      return res.status(status).json({
        error: "Authentication Failure",
        message: "Failed to authenticate with external service: " + authError.message
      });
    }

    // 2. Fetch all depots
    let depots;
    try {
      depots = await depotService.getDepots(token);
    } catch (depotError) {
      // If unauthorized, clear cached token so next request re-authenticates
      if (depotError.status === 401 || depotError.status === 403) {
        authService.invalidateToken();
      }
      
      const status = depotError.status === 401 ? 401 : 502;
      const isTimeout = depotError.code === 'ECONNABORTED' || depotError.message.includes('timeout');
      
      return res.status(isTimeout ? 504 : status).json({
        error: isTimeout ? "Gateway Timeout" : "Bad Gateway",
        message: "Failed to retrieve depots from external API: " + depotError.message
      });
    }

    // Handle empty depots list
    if (!depots || depots.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "Empty depot list returned by external API"
      });
    }

    // 3. Fetch vehicles and run Knapsack optimization for each depot
    const results = [];
    let totalVehiclesFound = 0;

    for (const depot of depots) {
      let vehicles;
      try {
        vehicles = await vehicleService.getVehicles(token, depot.id);
      } catch (vehicleError) {
        if (vehicleError.status === 401 || vehicleError.status === 403) {
          authService.invalidateToken();
        }
        const status = vehicleError.status === 401 ? 401 : 502;
        const isTimeout = vehicleError.code === 'ECONNABORTED' || vehicleError.message.includes('timeout');

        return res.status(isTimeout ? 504 : status).json({
          error: isTimeout ? "Gateway Timeout" : "Bad Gateway",
          message: `Failed to retrieve vehicles for depot ${depot.id} from external API: ` + vehicleError.message
        });
      }

      // Filter vehicles belonging to this depot
      // Note: If vehicles returned by the endpoint do not have a depotId,
      // we assume all of them belong to this depot since we queried per depot.
      const depotVehicles = vehicles.filter(v => {
        return v.depotId === undefined || v.depotId === null || v.depotId === depot.id;
      });

      totalVehiclesFound += depotVehicles.length;

      // 4. Select tasks maximizing score while remaining within depot mechanic-hour capacity (0/1 Knapsack)
      const optimization = knapsackService.solve(depotVehicles, depot.mechanicHours);

      results.push({
        depotId: depot.id,
        selectedTasks: optimization.selectedTasks.map(task => task.taskId),
        totalHours: optimization.totalHours,
        totalScore: optimization.totalScore
      });
    }

    // Handle empty vehicle list across all depots
    if (totalVehiclesFound === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "Empty vehicle list returned by external API across all depots"
      });
    }

    // 5. Return optimized scheduling results
    return res.status(200).json({ results });

  } catch (error) {
    // Log unexpected errors and delegate to global error handler
    console.error("Unhandled controller error:", error);
    next(error);
  }
}

module.exports = {
  getSchedule
};
