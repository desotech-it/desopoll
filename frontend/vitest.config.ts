import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test config: jsdom environment for component tests, global test APIs, and a
// setup file that wires in @testing-library/jest-dom matchers + cleanup.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
