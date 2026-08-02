import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Staff admin panel. Built under /admin/ so it can be served either as a subpath
// of the public site or from its own host — the routes are identical either way.
export default defineConfig({
  base: "/admin/",
  server: {
    host: "::",
    port: 8081,
    hmr: { overlay: false },
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
