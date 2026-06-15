# System Operations & Scaling Playbook (Need2Done)

When scaling to high concurrent user traffic (especially when migrating to AWS), system resource spikes (CPU, Memory, or DB Pool saturation) can occur. This playbook provides step-by-step actions and code-level configurations to mitigate and resolve these spikes immediately.

---

## ⚡ 1. What to do if Host CPU is High (>85%)

High CPU in a Node.js or Python backend usually means either **synchronous heavy computations** (blocking the single-threaded event loop) or **extreme request throughput**.

### 🛠️ Immediate Operational Mitigation:
1. **Restart the Processes safely with PM2:**
   If you are running the backend in production, use **PM2** (Process Manager 2) instead of raw `node server.js`. PM2 handles auto-restarts, clustering, and zero-downtime reloads.
   ```bash
   pm2 reload all
   ```
2. **Identify the hogging process (Linux/AWS EC2):**
   ```bash
   top -o %CPU
   ```
   Note the Process ID (PID) to check if it's the `node` (port 5000) or `python` (port 8000) thread.

### 📈 Scaling Resolutions (Long-term):
1. **Cluster Mode (Horizontal scaling on single VM):**
   Node.js runs on a single thread. To utilize all CPU cores of your AWS instance, launch Node in PM2’s **Cluster Mode**:
   ```bash
   pm2 start server.js -i max
   ```
   *This automatically spawns replicas of your backend based on the number of CPU cores available, instantly dividing the load.*
2. **Load Balancer (AWS ALB):**
   When migrating to AWS, deploy your backend containers inside an **Auto Scaling Group** behind an Application Load Balancer. Spikes in CPU will automatically trigger AWS to spin up new EC2/ECS instances.

---

## 🧠 2. What to do if Memory is High (>85%)

High memory indicates that Node or Python is holding too many active objects in the heap. In Node, this is often caused by logs accumulating in memory, heavy payload buffers, or database query results that are too large.

### 🛠️ Immediate Operational Mitigation:
1. **Trigger Manual Garbage Collection (Operational):**
   If PM2 is active, you can instruct it to restart any process that exceeds a certain memory limit automatically:
   ```bash
   pm2 start server.js --max-memory-restart 500M
   ```
   *If the process leaks memory and hits 500MB, PM2 recycles the process in 0.1 seconds without dropping connections.*

### 📈 Scaling & Code Resolutions (Long-term):
1. **Implement Database Pagination:**
   Spikes occur when a dashboard page requests `"all orders ever"`. Ensure your backend endpoints (`/api/orders`) use `LIMIT` and `OFFSET` pagination rather than raw `SELECT *`.
2. **Stream Logs to Disk/CloudWatch:**
   Never store operational logs inside internal memory variables. Ensure the console logs write directly to stdout and let AWS CloudWatch or PM2 rotate files on the disk.

---

## 🗄️ 3. What to do if Connection Pool is High (>85%)

A saturated connection pool means all `connectionLimit` sockets (currently set to 10 in `db.js`) are busy processing slow database queries, forcing incoming requests into a waiting queue.

### 🛠️ Immediate Operational Mitigation:
1. **Increase Pool Limit (`backend/config/db.js`):**
   Change the `connectionLimit` dynamically based on your host size. For a standard 2-Core / 4GB RAM database instance, you can easily increase the pool limit from 10 to 50:
   ```javascript
   const pool = mysql.createPool({
       host: process.env.DB_HOST,
       user: process.env.DB_USER,
       connectionLimit: 50,  // Increase this!
       waitForConnections: true,
       queueLimit: 0
   });
   ```
2. **Increase MySQL Max Connections (Database Config):**
   If you increase the Node pool size, ensure your MySQL database server is configured to accept it. 
   Log into MySQL and check/update the global limits:
   ```sql
   SET GLOBAL max_connections = 250;
   ```

### 📈 Scaling & Code Resolutions (Long-term):
1. **Optimize SQL Indexes:**
   Slow queries hold database connections open longer, rapidly exhausting the pool. Ensure your search columns are indexed:
   ```sql
   ALTER TABLE orders ADD INDEX idx_status (status);
   ALTER TABLE helper_live_tracking ADD INDEX idx_order (order_id);
   ```
2. **Read/Write Splitting (AWS RDS):**
   Customer tracking polls (`/api/tracking/live/:token`) are extremely read-heavy. In AWS, set up a **MySQL Read Replica** and route all read pings to the replica, leaving the primary database instance entirely free to handle write bookings.

---

## 🚨 Checklist for AWS Production Readiness

When you move your stack from `run.bat` (local) to AWS (Cloud):
- [ ] **Process Manager:** Run both Node and Python under `pm2`.
- [ ] **Reverse Proxy:** Place Nginx or AWS ALB in front of port 5000 to manage SSL, compress assets, and throttle high-frequency ping requests.
- [ ] **Environment:** Separate the Database into **AWS RDS MySQL** (fully managed and auto-scaled).
- [ ] **Alerts:** Wire up CloudWatch alarms to send you email/Slack alerts when host memory or RDS CPU crosses 75%.
