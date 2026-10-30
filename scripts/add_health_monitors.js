/**
 * Add new monitors to Uptime Kuma:
 * - System Health (CPU/RAM)
 * - Database Health (MySQL dedicated)
 * - WhatsApp Bot dedicated health
 * - Helpers & Dispatch (auth-protected = 401 means UP)
 */
const { io } = require("/need2done/app/uptime-kuma/node_modules/socket.io-client");

const USERNAME = "need2done";
const PASSWORD = "N2done@2";
const URL = "http://127.0.0.1:3001";

const NEW_MONITORS = [
  {
    name: "💻 Server System Health (CPU & RAM)",
    type: "http",
    url: "http://127.0.0.1:5000/api/health/system",
    interval: 60,
    maxretries: 3,
    accepted_statuscodes: ["200-299"],
    conditions: [],
    // Returns 503 if CPU>90% or RAM>90% — real alert
  },
  {
    name: "🗄️ MySQL Database Health",
    type: "http",
    url: "http://127.0.0.1:5000/api/health/db",
    interval: 30,
    maxretries: 3,
    accepted_statuscodes: ["200-299"],
    conditions: [],
    // Returns 503 if MySQL is unreachable
  },
  {
    name: "🤖 WhatsApp Bot Health (Dedicated)",
    type: "http",
    url: "http://127.0.0.1:5000/api/health/bot",
    interval: 30,
    maxretries: 3,
    accepted_statuscodes: ["200-299"],
    conditions: [],
    // Proxies to port 8000 — 503 if bot down
  },
  {
    name: "🛵 Helpers & Dispatch API",
    type: "http",
    url: "http://127.0.0.1:5000/api/helpers",
    interval: 60,
    maxretries: 3,
    // 401 = auth required = SERVER IS UP and running
    accepted_statuscodes: ["200-499"],
    conditions: [],
  },
];

const client = io(URL, { transports: ["websocket"] });

client.on("connect", () => {
  console.log("✅ Connected");
  client.emit("login", { username: USERNAME, password: PASSWORD }, (res) => {
    if (!res.ok) { console.error("❌ Login:", res.msg); process.exit(1); }
    console.log("✅ Logged in\n");
    addNext(0);
  });
});

function addNext(i) {
  if (i >= NEW_MONITORS.length) {
    console.log("\n🎉 All new monitors added!");
    client.disconnect();
    process.exit(0);
  }
  const m = {
    retryInterval: 60,
    upsideDown: false,
    notificationIDList: {},
    ignoreTls: false,
    expiryNotification: false,
    ...NEW_MONITORS[i],
  };
  client.emit("add", m, (res) => {
    if (res && res.ok) console.log(`✅ Added: ${m.name}`);
    else console.log(`❌ Failed: ${m.name} — ${res ? res.msg : "no response"}`);
    setTimeout(() => addNext(i + 1), 600);
  });
}

client.on("connect_error", (err) => { console.error("❌", err.message); process.exit(1); });
setTimeout(() => { console.error("❌ Timeout"); process.exit(1); }, 20000);
