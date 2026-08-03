import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Staff admin panel. Built under /admin/ so it can be served either as a subpath
// of the public site or from its own host — the routes are identical either way.
/**
 * Dev only. With `base: "/admin/"`, Vite 404s a bare "/admin" — the one URL
 * anyone types by hand. Redirect it to the base instead of serving a dead end.
 * Static hosts do this themselves; production never sees this plugin.
 */
const redirectBareBase = () => ({
  name: "admin-redirect-bare-base",
  apply: "serve" as const,
  configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
    server.middlewares.use((req: { url?: string }, res: { writeHead: (c: number, h: Record<string, string>) => void; end: () => void }, next: () => void) => {
      if (req.url === "/admin" || req.url?.startsWith("/admin?")) {
        res.writeHead(302, { Location: req.url.replace("/admin", "/admin/") });
        res.end();
        return;
      }
      next();
    });
  },
});

export default defineConfig({
  base: "/admin/",
  server: {
    host: "::",
    port: 8081,
    hmr: { overlay: false },
    proxy: { "/api": "http://localhost:3001" },
  },
  plugins: [react(), redirectBareBase()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../Shared/src"),
      "@contracts": path.resolve(__dirname, "../Shared/contracts"),
    },
  },
});
