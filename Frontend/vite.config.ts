import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/** Keep in step with Shared/src/lib/siteMeta.ts and scripts/generate-sitemap.mjs. */
const DEFAULT_SITE_ORIGIN = "https://cresciva.vercel.app";

/**
 * Substitutes %SITE_ORIGIN% in index.html.
 *
 * The static tags in index.html are the ones that matter for link previews:
 * Facebook, LinkedIn, Slack and X do not execute JavaScript, so they never see
 * anything <SEO> writes at runtime. They have to be absolute and correct at
 * build time, which means the origin can't be a hardcoded literal in the HTML.
 */
const siteOrigin = (mode: string) => {
  const origin = (
    loadEnv(mode, path.resolve(__dirname), "VITE_").VITE_SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN
  ).replace(/\/+$/, "");
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
