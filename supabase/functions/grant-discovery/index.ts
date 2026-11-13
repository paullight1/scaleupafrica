import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { GRANT_FEEDS, parseGrantFeed, type GrantDiscoveryRow } from '../_shared/grantDiscovery.ts';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply({ error: 'Use POST' }, 405);
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const expected = Deno.env.get('GRANT_DISCOVERY_SECRET') ?? '';
  const supplied = request.headers.get('X-Cresciva-Discovery-Secret') ?? '';
  let allowed = expected.length >= 32 && await sameSecret(supplied, expected);
  if (!allowed) {
    const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return reply({ error: 'Unauthorized' }, 401);
    const { data: { user }, error } = await service.auth.getUser(token);
    if (error || !user) return reply({ error: 'Unauthorized' }, 401);
    const role = await service.rpc('is_staff', { _user_id: user.id });
    allowed = !role.error && role.data === true;
    if (!allowed) return reply({ error: 'Forbidden' }, 403);
  }
  const { data: run, error: runError } = await service.from('grant_discovery_runs').insert({}).select('id').single();
  if (runError || !run) return reply({ error: 'Could not start import' }, 503);
  try {
    const outcomes = await Promise.all(GRANT_FEEDS.map(async (source) => {
      try {
        // URLs are fixed in code; no user-controlled fetches or redirect targets.
        const response = await fetch(source.url, {
          headers: { 'User-Agent': 'CrescivaFundingBot/1.0 (+https://www.crescivacapital.com)', Accept: 'application/rss+xml, application/xml, text/xml' },
          redirect: 'error', signal: AbortSignal.timeout(18_000),
        });
        if (!response.ok) throw new Error(`http_${response.status}`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error('empty_body');
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 2_000_000) throw new Error('feed_too_large');
            chunks.push(value);
          }
        } finally { await reader.cancel().catch(() => {}); }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        const rows = parseGrantFeed(new TextDecoder().decode(bytes), source);
        return { url: source.url, ok: true, count: rows.length, error: null, rows };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'fetch_failed';
        return { url: source.url, ok: false, count: 0, error: /^(http_\d{3}|invalid_rss|feed_too_large|empty_body)$/.test(message) ? message : 'fetch_failed', rows: [] as GrantDiscoveryRow[] };
      }
    }));
    const rows = [...new Map(outcomes.flatMap(o => o.rows).map(row => [row.url, row])).values()];
    const successCount = outcomes.filter(o => o.ok).length;
    const { data: imported, error: importError } = successCount ? await service.rpc('import_grant_discoveries', { _rows: rows }) : { data: 0, error: null };
    if (importError) throw new Error('database_import_failed');
    const status = successCount === 0 ? 'failed' : successCount === outcomes.length ? 'success' : 'partial';
    const sources = outcomes.map(({ rows: _rows, ...outcome }) => outcome);
    const { error: finishError } = await service.from('grant_discovery_runs').update({ status, finished_at: new Date().toISOString(), imported_count: imported ?? 0, discovered_count: rows.length, sources }).eq('id', run.id);
    if (finishError) throw new Error('run_update_failed');
    console.log(JSON.stringify({ event: 'grant_discovery_finished', run_id: run.id, status, imported: imported ?? 0, discovered: rows.length }));
    return reply({ run_id: run.id, status, imported: imported ?? 0, discovered: rows.length, sources }, successCount ? 200 : 502);
  } catch {
    await service.from('grant_discovery_runs').update({ status: 'failed', finished_at: new Date().toISOString() }).eq('id', run.id);
    return reply({ error: 'Grant import failed', run_id: run.id }, 500);
  }
});

async function sameSecret(a: string, b: string): Promise<boolean> {
  const encode = new TextEncoder();
  const [left, right] = await Promise.all([a, b].map(value => crypto.subtle.digest('SHA-256', encode.encode(value))));
  const l = new Uint8Array(left), r = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < l.length; i++) difference |= l[i] ^ r[i];
  return difference === 0;
}
