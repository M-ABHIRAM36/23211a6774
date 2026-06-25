function solve(tasks, capacity) {
  const n = tasks.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const task = tasks[i - 1];
    const weight = Math.round(task.duration);
    const value = Math.round(task.score);

    for (let w = 0; w <= capacity; w++) {
      if (weight <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weight] + value);
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  const selectedTasks = [];
  let w = capacity;
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selectedTasks.push(tasks[i - 1]);
      w -= Math.round(tasks[i - 1].duration);
    }
  }

  return {
    selectedTasks: selectedTasks.reverse(),
    totalHours: capacity - w,
    totalScore: dp[n][capacity]
  };
}

module.exports = { solve };
