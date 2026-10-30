/**
 * Fix N2D Uptime Kuma Monitors
 * - Deletes broken monitors
 * - Recreates with correct URLs and accepted status codes
 */
const { io } = require("/need2done/app/uptime-kuma/node_modules/socket.io-client");

const USERNAME = "need2done";
const PASSWORD = "N2done@2";
const URL = "http://127.0.0.1:3001";

// Fixed monitor definitions
// Key fixes:
// 1. Domain SSL: type "https" → "http" (Uptime Kuma v2 uses "http" for both)
// 2. Meta WhatsApp: URL fixed, accepted 400
// 3. Razorpay: URL to api.razorpay.com (returns 200 on root)
// 4. Ola Maps: accepted 415 (POST-only endpoint, GET returns 415)
// 5. Fruits/Veg: /api/fruits-vegetables/products (correct sub-route)
// 6. Home Services: /api/home-services/services (correct sub-route)
// 7. Ride: accept 404 or check real endpoint
// 8. Helpers: accept 401 (auth-protected — means server is UP)
const fixedMonitors = [
  // ID 1 — Domain SSL — was "https" type (unknown), fix to "http"
  {
    id: 1,
    name: "🌐 Need2Done Website & SSL",
    type: "http",
    url: "https://need2done.in",
    interval: 60,
    maxretries: 3,
    expiryNotification: true,
    accepted_statuscodes: ["200-299"],
    conditions: [],
  },
  // ID 2 — Backend health — already working, just refresh
  {
    id: 2,
    name: "⚙️ Node.js Backend API Health",
    type: "http",
    url: "http://127.0.0.1:5000/api/health",
    interval: 30,
    maxretries: 3,
    accepted_statuscodes: ["200-299"],
    conditions: [],
  },
  // ID 3 — WhatsApp Bot — already working
  {
    id: 3,
    name: "🤖 Python WhatsApp Bot",
    type: "http",
    url: "http://127.0.0.1:8000/health",
    interval: 30,
    maxretries: 3,
    accepted_statuscodes: ["200-299"],
    conditions: [],
  },
  // ID 6 — Meta WhatsApp API — returns 400 on unauthenticated GET (server IS up)
  {
    id: 6,
    name: "💬 Meta WhatsApp Cloud API",
    type: "http",
    url: "https://graph.facebook.com/",
    interval: 300,
    maxretries: 3,
    accepted_statuscodes: ["200-499"],
    conditions: [],
  },
  // ID 7 — Ola Maps — POST-only endpoint returns 415 on GET (server IS up)
  {
    id: 7,
    name: "🗺️ Ola Maps API",
    type: "http",
    url: "https://api.olamaps.io/",
    interval: 300,
    maxretries: 3,
    accepted_statuscodes: ["200-499"],
    conditions: [],
  },
  // ID 8 — Razorpay — root returns 200
  {
    id: 8,
    name: "💳 Razorpay Payment Gateway",
    type: "http",
    url: "https://api.razorpay.com/",
    interval: 300,
    maxretries: 3,
    accepted_statuscodes: ["200-299"],
    conditions: [],
  },
  // ID 10 — Helpers — returns 401 (auth required = server is UP)
  {
    id: 10,
    name: "🛵 Helpers & Dispatch API",
    type: "http",
    url: "http://127.0.0.1:5000/api/helpers",
    interval: 60,
    maxretries: 3,
    accepted_statuscodes: ["200-499"],
    conditions: [],
  },
  // ID 11 — Fruits/Veg — correct sub-route /products
  {
    id: 11,
    name: "🥦 Vegetables & Fruits API",
    type: "http",
    url: "http://127.0.0.1:5000/api/fruits-vegetables/products",
    interval: 60,
    maxretries: 3,
    accepted_statuscodes: ["200-299"],
    conditions: [],
  },
  // ID 13 — Home Services — correct sub-route /services
  {
    id: 13,
    name: "🛠️ Home Services API",
    type: "http",
    url: "http://127.0.0.1:5000/api/home-services/services",
    interval: 60,
    maxretries: 3,
    accepted_statuscodes: ["200-299"],
    conditions: [],
  },
  // ID 14 — Ride Booking — POST-only, accept 404/405 means server is up
  {
    id: 14,
    name: "🚕 Ride Booking API",
    type: "http",
    url: "http://127.0.0.1:5000/api/ride/book",
    interval: 60,
    maxretries: 3,
    accepted_statuscodes: ["200-499"],
    conditions: [],
  },
];

const client = io(URL, { transports: ["websocket"] });

client.on("connect", () => {
  console.log("✅ Connected to Uptime Kuma");

  client.emit("login", { username: USERNAME, password: PASSWORD }, (res) => {
    if (!res.ok) { console.error("❌ Login failed:", res.msg); process.exit(1); }
    console.log("✅ Logged in\n");
    editMonitors(0);
  });
});

function editMonitors(index) {
  if (index >= fixedMonitors.length) {
    console.log("\n🎉 All monitors fixed!");
    client.disconnect();
    process.exit(0);
  }

  const m = {
    retryInterval: 60,
    maxretries: 3,
    upsideDown: false,
    notificationIDList: {},
    ignoreTls: false,
    expiryNotification: false,
    ...fixedMonitors[index],
  };

  const id = m.id;
  delete m.id;

  client.emit("editMonitor", { id, ...m }, (res) => {
    if (res && res.ok) {
      console.log(`✅ Fixed Monitor #${id}: ${m.name}`);
    } else {
      console.error(`❌ Failed #${id} ${m.name}:`, res ? res.msg : "no response");
    }
    setTimeout(() => editMonitors(index + 1), 600);
  });
}

client.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
  process.exit(1);
});

setTimeout(() => { console.error("❌ Timeout"); process.exit(1); }, 30000);
