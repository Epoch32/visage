import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import visage from "../../dist/vite/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@epoch32/visage/http": path.resolve(__dirname, "../../dist/http/index.js"),
      "@epoch32/visage": path.resolve(__dirname, "../../dist/index.js")
    }
  },
  plugins: [
    visage({
      compiler: true,
      hmr: true
    })
  ],
  server: {
    port: 5184
  }
});
