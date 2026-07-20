import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

/**
 * unplugin-swc emits decorator metadata so NestJS DI classes load under Vitest.
 * Unit tests here are pure logic + guard/DTO validation (no live DB) per plan 07 §9.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.spec.ts", "src/**/*.spec.ts"],
  },
  plugins: [swc.vite({ module: { type: "es6" } })],
});
