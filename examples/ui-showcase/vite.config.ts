import { defineConfig } from "vite";
import { visage, visageLucide } from "../../src/vite";

export default defineConfig({
  plugins: [
    visage({
      devtools: true,
      hmr: true
    }),
    visageLucide()
  ],
  resolve: {
    alias: {
      visage: new URL("../../src", import.meta.url).pathname
    }
  },
  server: {
    port: 5180
  }
});
