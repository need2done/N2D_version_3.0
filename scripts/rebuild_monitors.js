/**
 * N2D Uptime Kuma — Complete Monitor Rebuild
 * 
 * Step 1: Delete non-live service monitors (IDs 6-14 except 9, 12)
 * Step 2: Fix broken monitors (SSL, external APIs)  
 * Step 3: Add active service monitors (Home Services, Custom Work)
 * 
 * ACTIVE SERVICES on N2D right now:
 *   - Home Services ✅
 *   - Custom Work ✅
 *   - Medicine (no API yet — skip)
 * 
 * NOT LIVE YET (delete monitors):
 *   - Ride Booking, Vegetables & Fruits, Helpers, Groceries, Orders
 */
const { io } = require("/need2done/app/uptime-kuma/node_modules/socket.io-client");

const USERNAME = "need2done";
const PASSWORD = "N2done@2";
const URL = "http://127.0.0.1:3001";

// IDs to DELETE (not live services + duplicates)
// 9=Orders, 10=Helpers, 11=Fruits/Veg, 12=Groceries, 14=Ride
const DELETE_IDS = [9, 10, 11, 12, 14];

// Monitors to EDIT (fix URLs/accepted codes)
const EDIT_MONITORS = [
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
];

// Monitors to ADD (active services not yet monitored)
const ADD_MONITORS = [
  {
    name: "🔧 Custom Work API",
    type: "http",
    url: "http://127.0.0.1:5000/api/custom-work/rate-card",
    interval: 60,
    maxretries: 3,
    accepted_statuscodes: ["200-299"],
    conditions: [],
  },
];

const client = io(URL, { transports: ["websocket"] });

client.on("connect", () => {
  console.log("✅ Connected\n");
  client.emit("login", { username: USERNAME, password: PASSWORD }, (res) => {
    if (!res.ok) { console.error("❌ Login failed:", res.msg); process.exit(1); }
    console.log("✅ Logged in\n");

    step1_delete(0);
  });
});

// STEP 1: Delete non-live monitors
function step1_delete(i) {
  if (i >= DELETE_IDS.length) {
    console.log("\n--- Step 2: Fixing broken monitors ---\n");
    return step2_edit(0);
  }
  const id = DELETE_IDS[i];
  client.emit("deleteMonitor", id, (res) => {
    if (res && res.ok) {
      console.log(`🗑️  Deleted Monitor #${id}`);
    } else {
      console.log(`⚠️  Delete #${id}: ${res ? res.msg : "no response"}`);
    }
    setTimeout(() => step1_delete(i + 1), 500);
  });
}

// STEP 2: Edit/fix broken monitors
function step2_edit(i) {
  if (i >= EDIT_MONITORS.length) {
    console.log("\n--- Step 3: Adding active service monitors ---\n");
    return step3_add(0);
  }
  const m = EDIT_MONITORS[i];
  const id = m.id;
  const payload = {
    retryInterval: 60,
    upsideDown: false,
    notificationIDList: {},
    ignoreTls: false,
    expiryNotification: m.expiryNotification || false,
    ...m,
  };
  delete payload.id;

  client.emit("editMonitor", { id, ...payload }, (res) => {
    if (res && res.ok) {
      console.log(`✅ Fixed Monitor #${id}: ${m.name}`);
    } else {
      console.log(`❌ Fix #${id} ${m.name}: ${res ? res.msg : "no response"}`);
    }
    setTimeout(() => step2_edit(i + 1), 600);
  });
}

// STEP 3: Add new active service monitors
function step3_add(i) {
  if (i >= ADD_MONITORS.length) {
    console.log("\n🎉 All done! Refresh your Uptime Kuma dashboard in 60 seconds.");
    client.disconnect();
    process.exit(0);
  }
  const m = {
    retryInterval: 60,
    upsideDown: false,
    notificationIDList: {},
    ignoreTls: false,
    expiryNotification: false,
    ...ADD_MONITORS[i],
  };
  client.emit("add", m, (res) => {
    if (res && res.ok) {
      console.log(`➕ Added: ${m.name}`);
    } else {
      console.log(`❌ Add ${m.name}: ${res ? res.msg : "no response"}`);
    }
    setTimeout(() => step3_add(i + 1), 500);
  });
}

client.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
  process.exit(1);
});

setTimeout(() => { console.error("❌ Timeout"); process.exit(1); }, 30000);
