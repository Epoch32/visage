import { query } from "visage/api";

export default query({
  resolve: () => ({
    status: "ok",
    version: "0.1.0",
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 100),
    timestamp: new Date().toISOString()
  })
});
