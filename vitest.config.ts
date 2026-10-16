import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Testes das regras do front (tests/). Não abrem navegador nem falam com o banco.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@riff/core": fileURLToPath(new URL("./packages/core/src", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
