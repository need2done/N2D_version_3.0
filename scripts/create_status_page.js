/**
 * Create N2D Public Status Page in Uptime Kuma v2
 * Monitors were added with IDs 1-14 sequentially
 */
const { io } = require("/need2done/app/uptime-kuma/node_modules/socket.io-client");

const USERNAME = "need2done";
const PASSWORD = "N2done@2";
const URL = "http://127.0.0.1:3001";

const client = io(URL, { transports: ["websocket"] });

// Monitor IDs 1-14 in 3 groups
const publicGroups = [
  {
    name: "🟢 Core Infrastructure",
    weight: 1,
    monitorList: [
      { id: 1 }, // Domain & SSL
      { id: 2 }, // Node.js Backend
      { id: 3 }, // WhatsApp Bot
      { id: 4 }, // MySQL
      { id: 5 }, // Nginx
    ],
  },
  {
    name: "🔌 External Payment & Maps",
    weight: 2,
    monitorList: [
      { id: 6 }, // Meta WhatsApp API
      { id: 7 }, // Ola Maps
      { id: 8 }, // Razorpay
    ],
  },
  {
    name: "📡 N2D Service APIs",
    weight: 3,
    monitorList: [
      { id: 9  }, // Orders
      { id: 10 }, // Helpers
      { id: 11 }, // Vegetables & Fruits
      { id: 12 }, // Groceries
      { id: 13 }, // Home Services
      { id: 14 }, // Ride Booking
    ],
  },
];

client.on("connect", () => {
  console.log("✅ Connected");

  client.emit("login", { username: USERNAME, password: PASSWORD }, (res) => {
    if (!res.ok) { console.error("❌ Login failed:", res.msg); process.exit(1); }
    console.log("✅ Logged in");

    const statusPage = {
      slug: "n2d",
      title: "Need2Done — System Status",
      description: "🚀 Real-time status of Need2Done hyperlocal services — Bhongir, Telangana",
      theme: "dark",
      published: true,
      showTags: false,
      domainNameList: [],
      googleAnalyticsId: "",
      customCSS: "",
      footerText: "Need2Done © 2026 | Bhongir, Telangana",
      showPoweredBy: false,
      publicGroupList: publicGroups,
    };

    client.emit("saveStatusPage", statusPage, null, (res2) => {
      if (res2 && res2.ok) {
        console.log("✅ Public status page created!");
        console.log("🌐 View at: https://need2done.in:3002/status/n2d");
      } else {
        console.log("Response:", JSON.stringify(res2));
      }
      client.disconnect();
      process.exit(0);
    });
  });
});

client.on("connect_error", (err) => {
  console.error("❌", err.message);
  process.exit(1);
});

setTimeout(() => { console.error("❌ Timeout"); process.exit(1); }, 15000);
