# Notification System Design

---

## Stage 1

### Core Actions of the Notification Platform
1. **Send Notification**: Allow administrators or systems (like placement cells, department heads) to publish notifications to individual students or groups of students.
2. **Retrieve Notifications**: Allow students to fetch their personal inbox of notifications.
3. **Mark Notification as Read**: Mark one or more notifications as read to track status and filter inbox lists.

### REST Endpoints

#### 1. Authentication
* **Endpoint**: `POST /api/auth/login`
* **Headers**:
  ```http
  Content-Type: application/json
  ```
* **Request JSON**:
  ```json
  {
    "email": "23211a6774@bvrit.ac.in",
    "name": "moguloju abhiram",
    "rollNo": "23211a6774",
    "accessCode": "ahXjvp",
    "clientID": "70ace46f-dbc8-4eab-a062-75d9a0d7a216",
    "clientSecret": "xaZpmDAMDTESDYus"
  }
  ```
* **Response JSON (201 Created)**:
  ```json
  {
    "token_type": "Bearer",
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "expires_in": 1782377468
  }
  ```

#### 2. Get Notifications
* **Endpoint**: `GET /api/notifications`
* **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Number of records per page (default: 10)
  - `isRead`: Filter by read status (true/false)
  - `type`: Filter by type (Placement/Result/Event)
* **Headers**:
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
  Accept: application/json
  ```
* **Request JSON**: None (GET request)
* **Response JSON (200 OK)**:
  ```json
  {
    "notifications": [
      {
        "id": "ff114091-1da0-40a8-a07e-e4e2e9a1f729",
        "type": "Result",
        "message": "internal exam results published",
        "isRead": false,
        "timestamp": "2026-06-25 05:17:22"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
  ```

#### 3. Mark Notification as Read
* **Endpoint**: `PATCH /api/notifications/:id/read`
* **Headers**:
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
  Content-Type: application/json
  ```
* **Request JSON**: None (Empty body, state updated via path ID parameter)
* **Response JSON (200 OK)**:
  ```json
  {
    "id": "ff114091-1da0-40a8-a07e-e4e2e9a1f729",
    "isRead": true,
    "updatedAt": "2026-06-25T09:51:00Z"
  }
  ```

#### 4. Send Bulk/Single Notification
* **Endpoint**: `POST /api/notifications`
* **Headers**:
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
  Content-Type: application/json
  ```
* **Request JSON**:
  ```json
  {
    "type": "Placement",
    "message": "Amazon is hiring for SDE-1 roles. Apply by tomorrow.",
    "targetGroup": "2027-batch",
    "studentIds": []
  }
  ```
* **Response JSON (201 Created)**:
  ```json
  {
    "id": "a84a9d1e-e461-41f1-8c0f-2976e4a9f713",
    "type": "Placement",
    "message": "Amazon is hiring for SDE-1 roles. Apply by tomorrow.",
    "status": "Queued",
    "createdAt": "2026-06-25T09:51:00Z"
  }
  ```

### Real-Time Notification Mechanism
To deliver notifications to the client in real-time, the system will use **Server-Sent Events (SSE)**.
- **Why SSE?**: Notifications are unidirectional (server pushes to client). SSE operates directly over HTTP, making it simpler to implement, lighter on resources than full duplex WebSockets, and natively supports automatic reconnection.
- **SSE Connection Endpoint**: `GET /api/notifications/stream`
  - Client opens connection using `EventSource` in JavaScript.
  - Server sends connection headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.

---

## Stage 2

### Database Selection & Justification
For this platform, a **Relational Database Management System (RDBMS)** like **PostgreSQL** is chosen.
- **Consistency and Integrity**: Relational database foreign keys ensure that mappings between notifications and students are consistent.
- **Structured Queries**: Fetching, filtering, and ordering notifications based on student preferences, read status, and datetime requires index-driven SQL query capabilities.
- **Atomic Operations**: Marking notifications as read or managing multi-table modifications must be transactionally safe.

### DB Schema Design

#### Table: `students`
* `id` (SERIAL PRIMARY KEY)
* `name` (VARCHAR(100))
* `email` (VARCHAR(100) UNIQUE)
* `roll_no` (VARCHAR(20) UNIQUE)

#### Table: `notifications`
* `id` (UUID PRIMARY KEY)
* `type` (VARCHAR(20)) -- Enum: 'Placement', 'Result', 'Event'
* `message` (TEXT)
* `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

#### Table: `student_notifications` (Many-to-Many Mapping)
* `student_id` (INT REFERENCES students(id) ON DELETE CASCADE)
* `notification_id` (UUID REFERENCES notifications(id) ON DELETE CASCADE)
* `is_read` (BOOLEAN DEFAULT FALSE)
* `read_at` (TIMESTAMP NULL)
* PRIMARY KEY (`student_id`, `notification_id`)

### Scalability Problems with Growing Data
1. **Large Table Slowdowns**: As millions of notifications accrue, querying the table takes longer due to deeper B-tree index structures and slower scans.
2. **Write Bottlenecks**: High insertion throughput (e.g. broadcasting to 50,000 students) causes lock contention on index updates.
3. **Storage Overhead**: Storing static messages for every single mapping row creates massive redundancy.

### Solutions for Scaling
1. **Vertical Partitioning**: Decouple actual message details from student mapping details. We store the notification message once in `notifications` and reference it in the mapping table `student_notifications`.
2. **Table Partitioning**: Partition the mapping table `student_notifications` by `created_at` date ranges (e.g., monthly). Older metadata can be archived.
3. **Database Sharding**: Share database loads horizontally by sharding the data based on `student_id`.
4. **Caching Layer**: Store the active notifications index or count of unread items in Redis to avoid hitting the database for simple load requests.

### SQL Queries

#### 1. Fetching Unread Notifications for a Student
```sql
SELECT n.id, n.type, n.message, sn.is_read, n.created_at
FROM student_notifications sn
JOIN notifications n ON sn.notification_id = n.id
WHERE sn.student_id = 1642 AND sn.is_read = FALSE
ORDER BY n.created_at DESC;
```

#### 2. Marking a Notification as Read
```sql
UPDATE student_notifications
SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
WHERE student_id = 1642 AND notification_id = 'ff114091-1da0-40a8-a07e-e4e2e9a1f729';
```

---

## Stage 3

### Query Analysis

#### Is the Query Correct?
Yes, the query is syntactically correct:
`SELECT * FROM notifications WHERE studentID = 1642 AND isRead = false ORDER BY createdAt DESC;`

#### Why is it Slow?
1. **Full Table Scan**: Without matching indexes, the query engine scans every database row to check the `studentID` and `isRead` conditions.
2. **Sorting Overhead**: If the database does not have an index that pre-sorts `createdAt`, it must perform an expensive sort operation in memory (filesort) for all matching items.

#### Expected Computation Cost
- **Without Indexing**: $\mathcal{O}(M)$ where $M$ is the total rows in the notifications table.
- **With Ideal Indexing**: $\mathcal{O}(\log M + K)$ where $M$ is the total rows and $K$ is the number of matched unread notifications.

#### Evaluation of Suggestion: "Index every column"
This is inefficient design:
1. **Write Performance Penalty**: Every insert, update, or delete becomes slower because the database must update every single index.
2. **Storage Waste**: Indexes consume significant disk space.
3. **Query Optimizers Use Single Indexes**: For a specific query, the optimizer typically uses only one composite index. Indexing columns like `message` or enums with low cardinality individually does not help.
4. **Better Alternative**: Create a single composite index on `(studentID, isRead, createdAt DESC)`.

### Query: Placement Notifications in the Last 7 Days
```sql
SELECT * FROM notifications
WHERE type = 'Placement'
  AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## Stage 4

### Solutions for Overload
1. **In-Memory Caching (Redis)**: Cache the unread count or the active top notifications array for each student.
2. **Polling to Real-time Stream transition**: Replace active HTTP pull requests with Server-Sent Events (SSE).
3. **HTTP Cache Control Headers**: Use `ETag` and `Cache-Control: private, max-age=60` headers.

### Trade-offs of Each Solution
- **Redis Cache**:
  - *Pros*: Instantly reduces database read queries to zero for cache hits.
  - *Cons*: Introduces cache invalidation complexity. We must invalidate or update the cached count when a notification is marked read or new item arrives.
- **Real-Time Push (SSE)**:
  - *Pros*: Eliminates page reload requests since updates stream live when they happen.
  - *Cons*: The server must maintain open TCP socket connections for every online user, increasing memory consumption.
- **HTTP Cache Control**:
  - *Pros*: Zero server setup; browsers respect cache headers.
  - *Cons*: Users will not see new updates until the local cache timeout expires, unless forced.

---

## Stage 5

### Problems with Sequential Processing Loop
1. **Blocking Latency**: Running synchronous tasks like sending email, writing to DB, and sending app push events sequentially for 50,000 students will block the server execution. If each iteration takes 100ms, the entire loop takes over 80 minutes to finish.
2. **No Retry Strategy**: If an email provider goes down, the entire loop stops or hangs.
3. **Coupling**: Database operations and email delivery are coupled. A slow database blocks email delivery.

### Failure Scenario: Email Fails for 200 Students Mid-way
- If it fails mid-way, the loop throws an exception. We lose progress, and have no easy record of which students received the email and which failed, leading to duplicates or missing deliveries on restart.

### Redesign for Reliability & Speed (Decoupling)
- Use a message queue (such as BullMQ, RabbitMQ, or AWS SQS).
- **Steps**:
  1. Trigger writes a single main notification entry to the database.
  2. Creates and queues 50,000 small message jobs representing each recipient.
  3. Worker processes read jobs from the queue concurrently.
  4. Failed tasks are re-queued automatically with an exponential backoff retry configuration.

### Revised Pseudocode
```javascript
async function triggerBulkNotification(message) {
  const notificationId = await saveNotificationDetails(message);
  const studentIds = await getAllStudentIds();
  
  for (const studentId of studentIds) {
    await pushToMessageQueue('notification-delivery', {
      studentId: studentId,
      notificationId: notificationId
    });
  }
}

async function processQueueJob(job) {
  const { studentId, notificationId } = job.data;
  
  try {
    await saveToDatabase(studentId, notificationId);
    await pushToApp(studentId, notificationId);
    await sendEmail(studentId, notificationId);
  } catch (error) {
    await markJobAsFailedForRetry(job.id);
  }
}
```

---

## Stage 6

### Priority Inbox Implementation (`notification-app-be/index.js`)

Below is the code written inside `notification-app-be/index.js` implementing the priority sorting:

```javascript
const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  try {
    const authOptions = {
      hostname: '4.224.186.213',
      port: 80,
      path: '/evaluation-service/auth',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const creds = {
      email: '23211a6774@bvrit.ac.in',
      name: 'moguloju abhiram',
      rollNo: '23211a6774',
      accessCode: 'ahXjvp',
      clientID: '70ace46f-dbc8-4eab-a062-75d9a0d7a216',
      clientSecret: 'xaZpmDAMDTESDYus'
    };

    const authRes = await makeRequest(authOptions, creds);
    const token = authRes.access_token;

    const getOptions = {
      hostname: '4.224.186.213',
      port: 80,
      path: '/evaluation-service/notifications',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const getRes = await makeRequest(getOptions);
    const notifications = getRes.notifications || [];

    const weights = {
      'Placement': 3,
      'Result': 2,
      'Event': 1
    };

    notifications.sort((a, b) => {
      const weightA = weights[a.Type] || 0;
      const weightB = weights[b.Type] || 0;

      if (weightA !== weightB) {
        return weightB - weightA;
      }

      const timeA = new Date(a.Timestamp.replace(' ', 'T')).getTime();
      const timeB = new Date(b.Timestamp.replace(' ', 'T')).getTime();
      return timeB - timeA;
    });

    const topTen = notifications.slice(0, 10);
    console.log(JSON.stringify(topTen, null, 2));

  } catch (error) {
    console.error('Execution failed:', error.message);
  }
}

run();
```

### Execution Output Logs

The console output logs verify the execution:

```json
[
  {
    "ID": "c5a89425-b0fb-464c-9609-10e24283f92d",
    "Type": "Placement",
    "Message": "Amazon.com Inc. hiring",
    "Timestamp": "2026-06-25 05:49:28"
  },
  {
    "ID": "bd793d05-2e63-4061-a431-594e5f82f0b4",
    "Type": "Placement",
    "Message": "Tesla Inc. hiring",
    "Timestamp": "2026-06-25 04:48:16"
  },
  {
    "ID": "54475ead-94ef-4149-811d-0ae2945d8263",
    "Type": "Placement",
    "Message": "Nvidia Corporation hiring",
    "Timestamp": "2026-06-24 23:49:55"
  },
  {
    "ID": "82a8e8cf-1e4d-4ff3-9d3a-8bfdba9b405d",
    "Type": "Placement",
    "Message": "Microsoft Corporation hiring",
    "Timestamp": "2026-06-24 22:20:22"
  },
  {
    "ID": "63a8ae95-0b4e-4762-b875-62f3ad801681",
    "Type": "Placement",
    "Message": "Alphabet Inc. Class C hiring",
    "Timestamp": "2026-06-24 22:19:46"
  },
  {
    "ID": "44527ad2-d57a-4d6a-81db-a62fd32c0b8c",
    "Type": "Result",
    "Message": "end-sem",
    "Timestamp": "2026-06-25 00:48:34"
  },
  {
    "ID": "94805a6e-a33a-4abb-b067-61672724a52f",
    "Type": "Result",
    "Message": "internal",
    "Timestamp": "2026-06-25 00:19:01"
  },
  {
    "ID": "7df2828a-32e5-4f2e-be15-3296c6458383",
    "Type": "Result",
    "Message": "external",
    "Timestamp": "2026-06-24 16:50:40"
  },
  {
    "ID": "dbb55991-940a-4246-88e5-39957ea8bebb",
    "Type": "Result",
    "Message": "project-review",
    "Timestamp": "2026-06-24 16:50:31"
  },
  {
    "ID": "7221ad48-4e9f-4fc0-b199-cc125632a347",
    "Type": "Result",
    "Message": "mid-sem",
    "Timestamp": "2026-06-24 15:17:49"
  }
]
```
