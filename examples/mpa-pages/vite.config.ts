import { defineConfig } from "vite";
import { visage, visageLucide } from "@epoch32/visage/vite";

export default defineConfig({
  plugins: [
    visage({
      pages: {
        dir: "src/pages",
        title: "Visage MPA Example",
        headTags: `<style>html, body { margin: 0; padding: 0; background-color: #0d1117; color: #c9d1d9; }</style>`,
        ssg: true
      }
    }),
    visageLucide()
  ],
  server: {
    port: 5190
  }
});

