import { defineConfig } from "vite";
import { visage, visageLucide } from "@epoch32/visage/vite";

export default defineConfig({
  plugins: [
    visage({
      pages: {
        dir: "src/pages",
        title: "Visage MPA Example",
        ssg: true
      }
    }),
    visageLucide()
  ],
  server: {
    port: 5190
  }
});

