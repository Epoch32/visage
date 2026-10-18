import { defineConfig } from "vite";
import { visage } from "@epoch32/visage/vite";

export default defineConfig({
  plugins: [
    visage({
      devtools: true,
      hmr: true
    })
  ],
  server: {
    port: 5180
  }
});
