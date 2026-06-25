const authService = require('../services/authService');
const depotService = require('../services/depotService');
const vehicleService = require('../services/vehicleService');
const knapsackService = require('../services/knapsackService');

async function getSchedule(req, res) {
  try {
    const token = await authService.getToken();
    const depots = await depotService.getDepots(token);

    if (!depots || depots.length === 0) {
      return res.status(404).json({ message: "No depots found" });
    }

    const results = [];
    for (const depot of depots) {
      const depotId = depot.ID !== undefined ? depot.ID : depot.id;
      const mechanicHours = depot.MechanicHours !== undefined ? depot.MechanicHours : (depot.mechanicHours !== undefined ? depot.mechanicHours : depot.hours);

      const vehicles = await vehicleService.getVehicles(token, depotId);
      const knapsackResult = knapsackService.solve(vehicles, mechanicHours);

      results.push({
        depotId,
        selectedTasks: knapsackResult.selectedTasks.map(t => t.taskId),
        totalHours: knapsackResult.totalHours,
        totalScore: knapsackResult.totalScore
      });
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error("Scheduler Controller Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getSchedule
};
