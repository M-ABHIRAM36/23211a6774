/**
 * Solves the 0/1 Knapsack problem for a set of vehicle tasks at a depot.
 * 
 * Target: Maximize total score while keeping total duration <= mechanic hours capacity.
 * Time Complexity: O(N * Capacity)
 * Space Complexity: O(N * Capacity) - Can be optimized to O(Capacity) if we only need the value,
 * but O(N * Capacity) is required to easily backtrack and identify which exact tasks were selected.
 * 
 * @param {Array} tasks Array of tasks, each containing { taskId, duration, score }
 * @param {number} capacity The maximum mechanic hours allowed
 * @returns {Object} { selectedTasks: Array, totalHours: number, totalScore: number }
 */
function solveKnapsack(tasks, capacity) {
  // Santize and filter input tasks (must have positive duration and non-negative score)
  const validTasks = tasks
    .filter(t => t.duration > 0 && t.score >= 0)
    .map(t => ({
      taskId: t.taskId,
      duration: Math.round(t.duration),
      score: Math.round(t.score)
    }));

  const maxCapacity = Math.max(0, Math.round(capacity));

  if (validTasks.length === 0 || maxCapacity === 0) {
    return {
      selectedTasks: [],
      totalHours: 0,
      totalScore: 0
    };
  }

  const n = validTasks.length;
  // dp[i][w] stores the maximum score using a subset of the first i tasks with weight limit w.
  const dp = Array.from({ length: n + 1 }, () => new Array(maxCapacity + 1).fill(0));

  // Fill the DP table
  for (let i = 1; i <= n; i++) {
    const task = validTasks[i - 1];
    const weight = task.duration;
    const value = task.score;

    for (let w = 0; w <= maxCapacity; w++) {
      if (weight <= w) {
        dp[i][w] = Math.max(
          dp[i - 1][w],
          dp[i - 1][w - weight] + value
        );
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  // Backtrack to identify selected tasks
  const selectedTasks = [];
  let w = maxCapacity;
  for (let i = n; i > 0; i--) {
    // If the value changed, it means the i-th task was included
    if (dp[i][w] !== dp[i - 1][w]) {
      const task = validTasks[i - 1];
      selectedTasks.push(task);
      w -= task.duration;
    }
  }

  const totalScore = dp[n][maxCapacity];
  const totalHours = maxCapacity - w;

  return {
    selectedTasks: selectedTasks.reverse(), // maintain original chronological order or index order
    totalHours,
    totalScore
  };
}

module.exports = {
  solve: solveKnapsack
};
