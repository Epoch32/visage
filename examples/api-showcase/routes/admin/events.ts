import { subscription } from "visage/api";

export default subscription({
  resolve: async function* () {
    let tick = 0;
    while (tick < 10) {
      tick++;
      yield {
        timestamp: new Date().toLocaleTimeString(),
        event: tick % 2 === 0 ? "metrics_tick" : "heartbeat",
        count: tick
      };
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
});
