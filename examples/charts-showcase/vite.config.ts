import { defineConfig } from "vite";
import { visage, visageLucide } from "@epoch32/visage/vite";

export default defineConfig({
  plugins: [
    visage({
      devtools: true,
      hmr: true
    }),
    visageLucide()
  ],
  server: {
    port: 5183
  }
});
