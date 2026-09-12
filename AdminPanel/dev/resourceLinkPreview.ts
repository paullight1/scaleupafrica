import { lookup } from "node:dns/promises";
import type { Plugin } from "vite";
import { createClient } from "@supabase/supabase-js";
import { handleResourceLinkPreview } from "../../supabase/functions/_shared/resourceLinkPreviewHandler";
import { fetchResourceLinkMetadata } from "../../supabase/functions/_shared/resourceLinkMetadata";
import { safeExternalFetch } from "../../supabase/functions/_shared/safeExternalFetch";

/** Local equivalent of the staff-only edge function; never included in production. */
export function resourceLinkPreview(env: Record<string, string>): Plugin {
  return {
    name: "resource-link-preview-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split("?")[0] !== "/admin/__resource-link-preview") return next();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "method_not_allowed" }));
          return;
        }
        try {
          const chunks: Buffer[] = [];
          let bytes = 0;
          for await (const chunk of req) {
            bytes += Buffer.byteLength(chunk);
            if (bytes > 8192) {
              res.statusCode = 413;
              res.end(JSON.stringify({ error: "invalid_request" }));
              return;
            }
            chunks.push(Buffer.from(chunk));
          }
          const authorization = req.headers.authorization ?? "";
          const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: authorization } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const request = new Request("http://localhost/admin/__resource-link-preview", {
            method: "POST", headers: { Authorization: authorization }, body: Buffer.concat(chunks).toString(),
          });
          const response = await handleResourceLinkPreview(request, {
            authenticate: async () => {
              const token = authorization.replace(/^Bearer\s+/i, "");
              if (!token) return null;
              const { data, error } = await client.auth.getUser(token);
              return error ? null : data.user?.id ?? null;
            },
            isStaff: async (userId) => {
              const { data, error } = await client.from("user_roles").select("role")
                .eq("user_id", userId).in("role", ["admin", "editor"]).limit(1);
              if (error) throw error;
              return Boolean(data?.length);
            },
            fetchMetadata: (url) => fetchResourceLinkMetadata(url, (target) => safeExternalFetch(target, {
              resolveDns: async (hostname) => (await lookup(hostname, { all: true })).map(({ address }) => address),
            })),
          });
          res.statusCode = response.status;
          res.end(await response.text());
        } catch {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: "unavailable" }));
        }
      });
    },
  };
}
