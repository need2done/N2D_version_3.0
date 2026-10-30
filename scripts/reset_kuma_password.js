const crypto = require("crypto");
const Database = require("/need2done/app/uptime-kuma/node_modules/better-sqlite3");

const db = new Database("/need2done/app/uptime-kuma/data/kuma.db");

// List users
const users = db.prepare("SELECT id, username FROM user").all();
console.log("Current users:", JSON.stringify(users));

// Hash new password using bcrypt-compatible method used by Uptime Kuma
// Uptime Kuma uses bcrypt. Let's use their own module
const bcrypt = require("/need2done/app/uptime-kuma/node_modules/bcryptjs");

const newPassword = "N2D@Kuma2026!";
const hash = bcrypt.hashSync(newPassword, 10);

if (users.length > 0) {
  const userId = users[0].id;
  db.prepare("UPDATE user SET password = ? WHERE id = ?").run(hash, userId);
  console.log(`✅ Password reset for user: ${users[0].username}`);
  console.log(`   New password: ${newPassword}`);
  console.log(`   User ID: ${userId}`);
} else {
  console.log("❌ No users found — account not created yet via UI");
}

db.close();
