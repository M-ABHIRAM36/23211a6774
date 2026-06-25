# Vehicle Maintenance Scheduler Backend (`vehicle-scheduler-be`)

A production-ready Node.js & Express.js microservice designed to optimize daily vehicle maintenance scheduling using the 0/1 Knapsack optimization algorithm.

---

## 📋 Table of Contents
1. [Problem Statement](#-problem-statement)
2. [Approach & Knapsack Explanation](#-approach--knapsack-explanation)
3. [Complexity Analysis](#%EF%B8%8F-complexity-analysis)
4. [Project Structure](#-project-structure)
5. [Installation & Setup](#%EF%B8%8F-installation--setup)
6. [API Usage](#-api-usage)
7. [Error Handling Design](#-error-handling-design)

---

## 🔍 Problem Statement

A logistics company performs vehicle maintenance every day. The scheduler must select an optimal subset of vehicle maintenance tasks under the following constraints:
1. Each maintenance task has a specific **TaskID**, **Duration** (mechanic hours), and **Priority/Score** (importance).
2. Tasks are assigned to specific **depots**, and each depot has a limited capacity of total **mechanic hours**.
3. **Objective:** Select tasks for each depot such that:
   - The total duration of selected tasks does not exceed the depot's mechanic hour capacity.
   - The sum of importance scores of the selected tasks is **maximized**.

This is isomorphic to the classic **0/1 Knapsack optimization problem**.

---

## 🧠 Approach & Knapsack Explanation

### The 0/1 Knapsack Problem
In the 0/1 Knapsack problem, we are given a set of items, each with a weight and a value. We need to determine the count of each item to include in a knapsack so that the total weight is less than or equal to a given limit, and the total value is as large as possible. The name "0/1" comes from the constraint that we must either select an item completely (1) or not select it at all (0); we cannot take a fractional part of an item.

In our system:
- **Knapsack Capacity** $\rightarrow$ Depot's `MechanicHours` limit.
- **Item Weight** $\rightarrow$ Maintenance task `Duration`.
- **Item Value** $\rightarrow$ Maintenance task importance `Score` / `Impact`.

### Dynamic Programming Formulation
We solve this using bottom-up Dynamic Programming (DP). 
Let $N$ be the number of tasks, and $W$ be the mechanic hour capacity.
We construct a 2D array `dp[N+1][W+1]` where `dp[i][j]` represents the maximum score achievable using a subset of the first $i$ tasks under a capacity limit of $j$ hours.

The state transition relation is:
$$dp[i][j] = \max(dp[i-1][j], dp[i-1][j - \text{duration}[i-1]] + \text{score}[i-1])$$

Once the dynamic programming table is filled:
1. The cell `dp[N][W]` yields the maximum total score.
2. We backtrack from `dp[N][W]` to identify the exact subset of tasks that contributed to this maximum score. If `dp[i][j] !== dp[i-1][j]`, it implies task $i$ was selected, and we deduct its duration from the remaining capacity $j$ and repeat.

---

## ⚡ Complexity Analysis

- **Time Complexity:** $\mathcal{O}(N \times W)$ per depot, where $N$ is the number of tasks assigned to the depot and $W$ is the mechanic hours budget. This is highly efficient and runs in milliseconds for realistic logistics scales.
- **Space Complexity:** $\mathcal{O}(N \times W)$ per depot. This is used to store the dynamic programming lookup table. It is necessary for back-tracking and identifying the selected `TaskID`s.

---

## 📂 Project Structure

```
vehicle-scheduler-be/
│
├── src/
│   ├── config/
│   │      axiosConfig.js         # Global Axios client instance with timeout
│   │
│   ├── controllers/
│   │      schedulerController.js # Thin controller orchestrating calls & validation
│   │
│   ├── services/
│   │      authService.js         # External OAuth Token manager with in-memory caching
│   │      depotService.js        # Depot retrieval and parser
│   │      vehicleService.js      # Vehicle retrieval and flexible DTO mapping
│   │      knapsackService.js     # 0/1 Knapsack DP optimizer
│   │
│   ├── routes/
│   │      schedulerRoutes.js     # API Route definitions
│   │
│   └── app.js                    # Express application and global middleware setup
│
├── server.js                     # Entry point launching the server
├── package.json                  # Dependencies and scripts
├── .env                          # Local credentials and target endpoints
└── README.md                     # Documentation
```

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (version `>= 18.17.0`)
- npm (version `>= 9.0.0`)

### 1. Clone & Install Dependencies
Navigate to the directory and install dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (based on template below):
```env
PORT=3000
BASE_URL=http://4.224.186.213/evaluation-service
EMAIL=23211a6774@bvrit.ac.in
NAME=moguloju abhiram
ROLL_NO=23211a6774
ACCESS_CODE=ahXjvp
CLIENT_ID=70ace46f-dbc8-4eab-a062-75d9a0d7a216
CLIENT_SECRET=xaZpmDAMDTESDYus
AXIOS_TIMEOUT=10000
```

### 3. Run the Server
For development (with automatic restarts using `nodemon`):
```bash
npm run dev
```

For production execution:
```bash
npm start
```

---

## 🚀 API Usage

### Schedule Tasks Endpoint
Retrieves depots, fetches tasks, optimizes them using Knapsack, and returns the selected tasks for each depot.

- **URL:** `/api/schedule`
- **Method:** `GET`
- **Headers:** None (the backend handles authentication with the external API transparently)

#### Sample Response (200 OK)
```json
{
  "results": [
    {
      "depotId": 2,
      "selectedTasks": [
        "ad5f4be8-36a8-4584-869a-aa2404c82142",
        "34b58228-5bb7-4cbd-8394-7278e0a8bd9c",
        "c5cf4ecb-2e4b-4c25-aeed-86913a059c01",
        "9e722699-7904-48f8-8590-707efdc20dc2"
      ],
      "totalHours": 18,
      "totalScore": 29
    },
    {
      "depotId": 3,
      "selectedTasks": [
        "c8b5b580-63a2-47fa-8260-ab968128ba51",
        "1df6cd20-64e2-433a-a7d1-18f854685bb6"
      ],
      "totalHours": 11,
      "totalScore": 8
    }
  ]
}
```

---

## 🛡️ Error Handling Design

The backend is built with defensive programming patterns and returns proper HTTP status codes:
- **401 Unauthorized**: If the external authentication service rejects the credentials or returns an invalid token.
- **404 Not Found**: If either the depot list or the vehicle list is empty.
- **500 Internal Server Error**: If local environmental variables are missing or a server-side syntax error occurs.
- **502 Bad Gateway**: If the external API fails (5xx errors) or returns an invalid schema.
- **504 Gateway Timeout**: If requests to the external API exceed the configured connection timeout limit.
