import { defineConfig } from "vite";
import { visage } from "@epoch32/visage/vite";

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
  ]
});
