import type { Plugin } from "vite";
import { createClient } from "@supabase/supabase-js";

const PREFIX = "/admin/__funding-engine";
const ALLOWED = [
  /^\/status$/,
  /^\/sources$/,
  /^\/stats$/,
  /^\/opportunities(?:\?limit=\d+)?$/,
  /^\/runs(?:\?limit=\d+)?$/,
  /^\/runs\/[A-Za-z0-9-]+\/opportunities$/,
];

function method(request: { method?: string }): string {
  return request.method?.toUpperCase() ?? "GET";
}

/** Development-only equivalent of the authenticated Cresciva backend relay. */
export function fundingEngineProxy(env: Record<string, string>): Plugin {
  const engineUrl = env.EDUTU_ENGINE_URL || "http://localhost:3000";
  const engineKey = env.EDUTU_ENGINE_API_KEY || "local-cresciva-engine-key-32bytes";
  return {
    name: "funding-engine-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(PREFIX)) return next();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");

        const enginePath = req.url.slice(PREFIX.length) || "/status";
        if (!ALLOWED.some((rule) => rule.test(enginePath)) || !["GET", "POST"].includes(method(req))) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: { message: "Engine route not found." } }));
          return;
        }

        try {
          const authorization = req.headers.authorization;
          if (!authorization?.startsWith("Bearer ")) throw new Error("unauthorized");
          const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: authorization } },
            auth: { persistSession: false },
          });
          const { data: { user }, error } = await client.auth.getUser(authorization.slice(7));
          if (error || !user) throw new Error("unauthorized");
          const roles = await client.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1);
          if (roles.error || !roles.data?.length) throw new Error("forbidden");

          const body = method(req) === "POST" ? await readBody(req) : undefined;
          const upstream = await fetch(
            engineUrl.replace(/\/+$/, "") +
              "/api/integrations/cresciva/engine" +
              enginePath,
            {
              method: method(req),
              headers: {
                "Content-Type": "application/json",
                "X-Cresciva-Engine-Key": engineKey,
              },
              body,
              signal: AbortSignal.timeout(15_000),
            },
          );
          res.statusCode = upstream.status;
          res.end(await upstream.text());
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          res.statusCode = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 502;
          res.end(JSON.stringify({ error: { message: res.statusCode === 502 ? "The opportunity engine could not be reached." : "Admin access required." } }));
        }
      });
    },
  };
}

async function readBody(req: AsyncIterable<unknown>): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > 16_384) throw new Error("request-too-large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}
