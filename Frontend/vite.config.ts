import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { DEFAULT_SITE_ORIGIN, normalizeSiteOrigin } from "../config/site-origin.js";

/**
 * Substitutes %SITE_ORIGIN% in index.html using the same default-origin contract
 * as runtime metadata and sitemap/robots generation.
 *
 * The static tags in index.html are the ones that matter for link previews:
 * Facebook, LinkedIn, Slack and X do not execute JavaScript, so they never see
 * anything <SEO> writes at runtime. They have to be absolute and correct at
 * build time.
 */
const siteOrigin = (mode: string) => {
  const origin = normalizeSiteOrigin(
    loadEnv(mode, path.resolve(__dirname), "VITE_").VITE_SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN,
  );
  return {
    name: "html-site-origin",
    transformIndexHtml: {
      // MUST be "pre". Vite's own vite:build-html runs decodeURI() over every
      // href while collecting assets, and a bare "%SITE_ORIGIN%" is an invalid
      // percent-escape — the build dies with "URI malformed" if we substitute
      // after it instead of before.
      order: "pre" as const,
      handler: (html: string) => html.replaceAll("%SITE_ORIGIN%", origin),
    },
  };
};

// Public site. Shared UI/auth is consumed as source from ../Shared via @shared/*.
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    // Dev-only: proxy API calls to the local NestJS server (../Backend, port 3001).
    // No effect in production; the frontend only hits /api when VITE_API_DOMAINS opts a domain in.
    proxy: { "/api": "http://localhost:3001" },
  },
  plugins: [react(), siteOrigin(mode)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../Shared/src"),
      "@contracts": path.resolve(__dirname, "../Shared/contracts"),
    },
  },
}));
