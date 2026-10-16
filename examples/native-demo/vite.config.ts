import { defineConfig } from "vite";
import { visage } from "../../src/vite";

export default defineConfig({
  plugins: [
    visage({
      experimental: {
        zigNative: {
          title: "Visage Native Demo",
          width: 1024,
          height: 768,
          scaffold: true,
          virtualOrigin: "visage://localhost"
        },
        secureTransforms: true,
        csp: true
      }
    })
  ],
  resolve: {
    alias: {
      visage: new URL("../../src", import.meta.url).pathname
    }
  }
});
