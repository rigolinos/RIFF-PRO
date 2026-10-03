import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Riff Clubes: app próprio, mesmo núcleo (@riff/core) e mesmo banco do Riff Pro.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  // .env.local da raiz do repositório (mesmo Supabase)
  envDir: fileURLToPath(new URL("../..", import.meta.url)),
  server: { port: 5174 },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@riff/core": fileURLToPath(new URL("../../packages/core/src", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
