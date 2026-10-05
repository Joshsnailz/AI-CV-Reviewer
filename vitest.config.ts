import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{apps,packages,workers}/*/src/**/*.test.ts"],
  },
});
