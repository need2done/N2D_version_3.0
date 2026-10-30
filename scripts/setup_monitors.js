/**
 * N2D Uptime Kuma Monitor Setup Script
 * Uses Socket.IO to programmatically add all 14 N2D monitors
 * Run: node /tmp/setup_monitors.js
 */

const { io } = require("/need2done/app/uptime-kuma/node_modules/socket.io-client");

const USERNAME = "need2done";
const PASSWORD = "N2done@2";
const URL      = "http://127.0.0.1:3001";

const monitors = [
  {
    name: "🌐 Need2Done Domain & SSL Certificate",
    type: "https",
    url: "https://need2done.in",
    interval: 60,
    maxretries: 3,
    expiryNotification: true,
  },
  {
    name: "⚙️ Node.js Backend API Health",
    type: "http",
    url: "http://127.0.0.1:5000/api/health",
    interval: 30,
    maxretries: 3,
  },
  {
    name: "🤖 Python WhatsApp Bot",
    type: "http",
    url: "http://127.0.0.1:8000/health",
    interval: 30,
    maxretries: 3,
  },
  {
    name: "🗄️ MySQL Database Port",
    type: "port",
    hostname: "127.0.0.1",
    port: 3306,
    interval: 60,
    maxretries: 3,
  },
  {
    name: "🖥️ Nginx Web Server Port :80",
    type: "port",
    hostname: "127.0.0.1",
    port: 80,
    interval: 60,
    maxretries: 3,
  },
  {
    name: "💬 Meta WhatsApp Cloud API",
    type: "http",
    url: "https://graph.facebook.com/v19.0/",
    interval: 300,
    maxretries: 3,
  },
  {
    name: "🗺️ Ola Maps OAuth API",
    type: "http",
    url: "https://account.olamaps.io/realms/olamaps/protocol/openid-connect/token",
    interval: 300,
    maxretries: 3,
  },
  {
    name: "💳 Razorpay Payment Gateway",
    type: "http",
    url: "https://api.razorpay.com/v1/",
    interval: 300,
    maxretries: 3,
  },
  {
    name: "📦 Orders API",
    type: "http",
    url: "http://127.0.0.1:5000/api/orders",
    interval: 60,
    maxretries: 3,
  },
  {
    name: "🛵 Helpers & Dispatch API",
    type: "http",
    url: "http://127.0.0.1:5000/api/helpers",
    interval: 60,
    maxretries: 3,
  },
  {
    name: "🥦 Vegetables & Fruits Catalog API",
    type: "http",
    url: "http://127.0.0.1:5000/api/fruits-vegetables",
    interval: 60,
    maxretries: 3,
  },
  {
    name: "🛒 Groceries Catalog API",
    type: "http",
    url: "http://127.0.0.1:5000/api/groceries/categories",
    interval: 60,
    maxretries: 3,
  },
  {
    name: "🛠️ Home Services API",
    type: "http",
    url: "http://127.0.0.1:5000/api/home-services",
    interval: 60,
    maxretries: 3,
  },
  {
    name: "🚕 Ride Booking API",
    type: "http",
    url: "http://127.0.0.1:5000/api/ride",
    interval: 60,
    maxretries: 3,
  },
];

const client = io(URL, { transports: ["websocket"] });

client.on("connect", () => {
  console.log("✅ Connected to Uptime Kuma");

  client.emit("login", { username: USERNAME, password: PASSWORD }, (res) => {
    if (!res.ok) {
      console.error("❌ Login failed:", res.msg);
      process.exit(1);
    }
    console.log("✅ Logged in successfully");
    addMonitors(0);
  });
});

function addMonitors(index) {
  if (index >= monitors.length) {
    console.log("\n🎉 All monitors added successfully!");
    client.disconnect();
    process.exit(0);
  }

  const m = {
    type: "http",
    interval: 60,
    retryInterval: 60,
    maxretries: 3,
    upsideDown: false,
    notificationIDList: {},
    ignoreTls: false,
    expiryNotification: false,
    accepted_statuscodes: ["200-299"],
    conditions: [],
    ...monitors[index],
    // strip fields that don't exist in schema
    acceptedStatuscodes: undefined,
  };

  client.emit("add", m, (res) => {
    if (res.ok) {
      console.log(`✅ [${index + 1}/${monitors.length}] Added: ${m.name}`);
    } else {
      console.error(`❌ Failed: ${m.name} — ${res.msg}`);
    }
    setTimeout(() => addMonitors(index + 1), 500);
  });
}

client.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error("❌ Timeout — exiting");
  process.exit(1);
}, 30000);
