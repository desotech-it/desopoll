import { defineConfig } from "vitest/config";

// Tests live in test/ and import source via ".js" specifiers (NodeNext). Vite resolves
// those to the matching ".ts" files, so no build step is needed to run the suite.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
