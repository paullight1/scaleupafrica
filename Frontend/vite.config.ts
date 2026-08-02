import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Public site. Shared UI/auth is consumed as source from ../Shared via @shared/*.
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    // Dev-only: proxy API calls to the local NestJS server (../Backend, port 3001).
    // No effect in production; the frontend only hits /api when VITE_API_DOMAINS opts a domain in.
    proxy: { "/api": "http://localhost:3001" },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../Shared/src"),
      "@contracts": path.resolve(__dirname, "../Shared/contracts"),
    },
  },
});
