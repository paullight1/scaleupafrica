import { proxyEdutuGrantRequest } from "./edutuGrantProxy.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("grant proxy forces the Edutu grants scope", async () => {
  let upstreamUrl = "";
  let upstreamBody: Record<string, unknown> = {};
  const response = await proxyEdutuGrantRequest(
    {
      action: "start-run",
      sourceId: 26,
      maxPages: 2,
      incremental: false,
    },
    {
      baseUrl: "https://edutu.example.com",
      apiKey: "x".repeat(32),
      fetcher: async (input, init) => {
        upstreamUrl = String(input);
        upstreamBody = JSON.parse(String(init?.body));
        return Response.json({ success: true });
      },
    },
  );

  assert(response.status === 202, "start-run should return 202");
  assert(upstreamUrl.endsWith("/api/integrations/cresciva/engine/runs"), "wrong upstream route");
  assert(upstreamBody.opportunityScope === "grants", "scope must be grants");
  assert(upstreamBody.sourceId === 26, "source id was not forwarded");
});

Deno.test("grant proxy only exposes allowlisted actions", async () => {
  let called = false;
  const response = await proxyEdutuGrantRequest(
    { action: "../../admin" },
    {
      baseUrl: "https://edutu.example.com",
      apiKey: "x".repeat(32),
      fetcher: async () => {
        called = true;
        return Response.json({});
      },
    },
  );

  assert(response.status === 400, "unknown actions should be rejected");
  assert(!called, "unknown actions must not reach Edutu");
});
