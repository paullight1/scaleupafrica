import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { resourceLinkPreview } from "./dev/resourceLinkPreview";
import { fundingEngineProxy } from "./dev/fundingEngineProxy";

// Staff admin panel. Built under /admin/ so it can be served either as a subpath
// of the public site or from its own host — the routes are identical either way.
/**
 * Dev only. With `base: "/admin/"`, Vite 404s a bare "/admin" — the one URL
 * anyone types by hand. Redirect it to the base instead of serving a dead end.
 * Static hosts do this themselves; production never sees this plugin.
 */
const redirectBareBase = (): Plugin => ({
  name: "admin-redirect-bare-base",
  apply: "serve" as const,
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === "/admin" || req.url?.startsWith("/admin?")) {
        res.writeHead(302, { Location: req.url.replace("/admin", "/admin/") });
        res.end();
        return;
      }
      next();
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  return {
    base: "/admin/",
    server: {
      host: "::",
      port: 8082,
      strictPort: true,
      hmr: { overlay: false },
      proxy: { "/api": "http://localhost:3001" },
    },
    plugins: [react(), redirectBareBase(), resourceLinkPreview(env), fundingEngineProxy(env)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "../Shared/src"),
        "@contracts": path.resolve(__dirname, "../Shared/contracts"),
      },
    },
  };
});
