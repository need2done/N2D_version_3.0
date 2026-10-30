const { io } = require("/need2done/app/uptime-kuma/node_modules/socket.io-client");
const c = io("http://127.0.0.1:3001", { transports: ["websocket"] });
c.on("connect", () => {
  c.emit("login", { username: "need2done", password: "N2done@2" }, (r) => {
    if (!r.ok) { console.log("fail", r.msg); process.exit(1); }
    c.emit("getMonitorList", (m) => {
      console.log("RAW KEYS:", Object.keys(m));
      const first = Object.values(m)[0];
      console.log("FIRST MONITOR:", JSON.stringify(first));
      c.disconnect();
      process.exit(0);
    });
  });
});
setTimeout(() => process.exit(1), 10000);
