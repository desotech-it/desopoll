import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy so the SPA can call the backend on :8080. In production the Gateway
// routes /api and /ws to the backend, so these are dev-only.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8080",
      "/ws": { target: "ws://localhost:8080", ws: true },
    },
  },
});
