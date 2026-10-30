/**
 * Live Alert Simulation Script for N2D
 * Creates a temporary failing monitor to trigger a real DOWN alert in the Telegram group,
 * then cleans it up.
 */
const { io } = require("/need2done/app/uptime-kuma/node_modules/socket.io-client");

const USERNAME = "need2done";
const PASSWORD = "N2done@2";
const URL = "http://127.0.0.1:3001";

const client = io(URL, { transports: ["websocket"] });

client.on("connect", () => {
  console.log("✅ Connected to Uptime Kuma");
  client.emit("login", { username: USERNAME, password: PASSWORD }, (res) => {
    if (!res.ok) { console.error("❌ Login failed:", res.msg); process.exit(1); }
    console.log("✅ Logged in");

    // Add temporary failing monitor
    const testMonitor = {
      name: "🧪 [TEST ALERT] Simulated Failing Service",
      type: "http",
      url: "http://127.0.0.1:5000/api/non-existent-test-route",
      interval: 10,
      retryInterval: 10,
      maxretries: 1,
      accepted_statuscodes: ["200-299"],
      conditions: [],
      notificationIDList: { 1: true }, // Attach Telegram alert group #1
      active: true,
    };

    client.emit("add", testMonitor, (res2) => {
      if (res2 && res2.ok) {
        const monitorId = res2.id;
        console.log(`✅ Temporary test monitor created (ID: ${monitorId})`);
        console.log("⏳ Uptime Kuma will check in 10 seconds and fire a DOWN alert to Telegram...");

        // Wait 25 seconds for the alert to fire, then remove the test monitor
        setTimeout(() => {
          console.log("🧹 Cleaning up temporary test monitor...");
          client.emit("deleteMonitor", monitorId, (res3) => {
            console.log("✅ Test monitor removed!");
            client.disconnect();
            process.exit(0);
          });
        }, 25000);
      } else {
        console.error("❌ Failed to create test monitor:", res2 ? res2.msg : "no response");
        client.disconnect();
        process.exit(1);
      }
    });
  });
});

client.on("connect_error", (err) => {
  console.error("❌", err.message);
  process.exit(1);
});

setTimeout(() => { console.error("❌ Timeout"); process.exit(1); }, 40000);
