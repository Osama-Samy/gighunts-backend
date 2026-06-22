import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(() => ({
  test: {
    fileParallelism: false,
    env: loadEnv("test", process.cwd(), ""),
    setupFiles: ["./test/setup.js"],
    environment: "node",
    reporters: ["default", "html"],
    outputFile: {
      html: "./test/results/index.html",
    },
  },
}));
