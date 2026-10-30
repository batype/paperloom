import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "/paperloom/",
  worker: { format: "es" },
  build: { chunkSizeWarningLimit: 1600 },
});
