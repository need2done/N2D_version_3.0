/**
 * Update Telegram Notification Chat ID to Supergroup ID in Uptime Kuma
 */
const { io } = require("/need2done/app/uptime-kuma/node_modules/socket.io-client");

const USERNAME = "need2done";
const PASSWORD = "N2done@2";
const URL = "http://127.0.0.1:3001";

const BOT_TOKEN = "8858022808:AAGElImU1H8nEduYOreLeaDIqkkaV9wR9iQ";
const CHAT_ID = "-1004380066640"; // Upgraded Supergroup ID

const client = io(URL, { transports: ["websocket"] });

client.on("connect", () => {
  console.log("✅ Connected to Uptime Kuma");
  client.emit("login", { username: USERNAME, password: PASSWORD }, (res) => {
    if (!res.ok) { console.error("❌ Login failed:", res.msg); process.exit(1); }
    console.log("✅ Logged in");

    const notification = {
      id: 1,
      name: "📱 Telegram N2D Alerts Group",
      type: "telegram",
      isDefault: true,
      telegramBotToken: BOT_TOKEN,
      telegramChatID: CHAT_ID,
      active: true,
    };

    client.emit("addNotification", notification, 1, (res2) => {
      if (res2 && res2.ok) {
        console.log("✅ Notification updated successfully!");
        
        // Test notification from Uptime Kuma
        client.emit("testNotification", notification, (res3) => {
          console.log("Uptime Kuma test alert result:", JSON.stringify(res3));
          client.disconnect();
          process.exit(0);
        });
      } else {
        console.error("❌ Failed to update notification:", res2 ? res2.msg : "no response");
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

setTimeout(() => { console.error("❌ Timeout"); process.exit(1); }, 15000);
