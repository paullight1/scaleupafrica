// Runs against a disposable database on the local PostgreSQL instance. Never uses production.
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const database = `cresciva_coupon_test_${process.pid}`;
const sql = (query) => execFileSync("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-d", database, "-c", query], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const admin = "00000000-0000-0000-0000-000000000001";
const user = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const asUser = (id, query) => `BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claims', '${JSON.stringify({ sub: id, aal: "aal1" })}', true); ${query}; COMMIT;`;
const rpc = (id, query) => sql(asUser(id, query)).split("\n").at(-1);
const rejects = (id, query, message) => assert.throws(() => rpc(id, query), (error) => String(error.stderr).includes(message));
function concurrent(id, code) {
  return new Promise((resolve) => {
    const child = spawn("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-d", database, "-c", asUser(id, `SELECT public.redeem_membership_coupon('${code}')`)]);
    let output = "";
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("close", (status) => resolve({ status, output }));
  });
}

execFileSync("createdb", [database]);
try {
  sql(`
    DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF; END $$;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE auth.mfa_factors(user_id uuid, status text);
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated, anon;
    CREATE TABLE public.subscriptions(user_id uuid PRIMARY KEY REFERENCES auth.users, has_access boolean DEFAULT false, expires_at timestamptz, plan_code text, billing_status text DEFAULT 'inactive' CHECK(billing_status IN ('inactive','active','attention','non-renewing','cancelled','completed')), auto_renew boolean DEFAULT false, next_payment_at timestamptz, cancel_at_period_end boolean DEFAULT false);
    CREATE TABLE public.admin_audit_log(id uuid DEFAULT gen_random_uuid(), actor_id uuid, action text, entity_type text, entity_id text, details jsonb DEFAULT '{}');
    CREATE FUNCTION public.is_admin(id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT id = '${admin}'::uuid $$;
    INSERT INTO auth.users SELECT ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid FROM generate_series(1,30) n;
    INSERT INTO public.subscriptions(user_id) SELECT id FROM auth.users;
  `);
  const migration = readFileSync(new URL("../supabase/migrations/20261104064132_membership_coupons.sql", import.meta.url), "utf8");
  sql(migration);
  sql(readFileSync(new URL("../supabase/migrations/20261104150445_coupon_preserve_billing_state.sql", import.meta.url), "utf8"));
  rejects(user(2), "SELECT public.admin_generate_membership_coupons(1,'day',false,NULL)", "Only administrators");
  rejects(admin, "SELECT public.admin_generate_membership_coupons(0,'day',false,NULL)", "between 1 and 500");
  rejects(admin, "SELECT public.admin_generate_membership_coupons(1,'year',false,NULL)", "expiry");
  const generate = (count, period, unlimited, code = null) => JSON.parse(rpc(admin, `SELECT jsonb_agg(c) FROM public.admin_generate_membership_coupons(${count},'${period}',${unlimited},${code ? `'${code}'` : "NULL"}) c`));
  const batch = generate(3, "week", false);
  assert.equal(new Set(batch.map((c) => c.code)).size, 3);
  assert.equal(batch[0].max_redemptions, 1);
  assert.ok(Math.abs(Date.parse(batch[0].expires_at) - Date.now() - 7 * 86400000) < 10000);
  const shared = generate(1, "month", true, "welcome-seven")[0];
  assert.equal(shared.code, "WELCOME-SEVEN");
  assert.equal(shared.max_redemptions, null);
  assert.equal(rpc(user(2), "SELECT count(*) FROM public.membership_coupons"), "0");
  rejects(user(2), "UPDATE public.membership_coupons SET redemption_count = 0", "permission denied");
  rejects(user(2), `SELECT public.admin_revoke_membership_coupon('${shared.id}')`, "Only administrators");
  rejects(user(2), "SELECT public.redeem_membership_coupon('INVALID')", "Invalid coupon");

  const receipt = JSON.parse(rpc(user(2), "SELECT public.redeem_membership_coupon(' welcome-seven ' )"));
  assert.equal(receipt.already_redeemed, false);
  assert.ok(Math.abs(Date.parse(receipt.access_expires_at) - Date.now() - 7 * 86400000) < 10000);
  assert.equal(sql(`SELECT has_access FROM public.subscriptions WHERE user_id='${user(2)}'`), "t");
  assert.equal(sql(`SELECT billing_status FROM public.subscriptions WHERE user_id='${user(2)}'`), "inactive", "Free access must not alter payment-provider billing state");
  const retry = JSON.parse(rpc(user(2), "SELECT public.redeem_membership_coupon('WELCOME-SEVEN')"));
  assert.equal(retry.already_redeemed, true);
  assert.equal(retry.access_expires_at, receipt.access_expires_at);
  rpc(user(3), "SELECT public.redeem_membership_coupon('WELCOME-SEVEN')");
  assert.equal(sql(`SELECT redemption_count FROM public.membership_coupons WHERE id='${shared.id}'`), "2");
  assert.equal(rpc(user(2), "SELECT count(*) FROM public.coupon_redemptions"), "1");

  const outcomes = await Promise.all([concurrent(user(4), batch[0].code), concurrent(user(5), batch[0].code)]);
  assert.equal(outcomes.filter((r) => r.status === 0).length, 1, "Exactly one simultaneous single-use redemption must succeed");
  assert.equal(sql(`SELECT redemption_count FROM public.membership_coupons WHERE id='${batch[0].id}'`), "1");
  const duplicate = await Promise.all([concurrent(user(6), shared.code), concurrent(user(6), shared.code)]);
  assert.ok(duplicate.every((r) => r.status === 0));
  assert.equal(sql(`SELECT count(*) FROM public.coupon_redemptions WHERE user_id='${user(6)}'`), "1");

  sql(`UPDATE public.subscriptions SET has_access=true, expires_at=now()+interval '30 days',plan_code='annual',billing_status='active',auto_renew=true WHERE user_id='${user(7)}'`);
  rpc(user(7), "SELECT public.redeem_membership_coupon('WELCOME-SEVEN')");
  assert.equal(sql(`SELECT plan_code || ':' || billing_status || ':' || auto_renew FROM public.subscriptions WHERE user_id='${user(7)}'`), "annual:active:true");
  assert.equal(sql(`SELECT abs(extract(epoch FROM expires_at-now())-37*86400)<10 FROM public.subscriptions WHERE user_id='${user(7)}'`), "t");
  sql(`UPDATE public.subscriptions SET has_access=false, expires_at=now()+interval '30 days' WHERE user_id='${user(8)}'`);
  rpc(user(8), "SELECT public.redeem_membership_coupon('WELCOME-SEVEN')");
  assert.equal(sql(`SELECT abs(extract(epoch FROM expires_at-now())-7*86400)<10 FROM public.subscriptions WHERE user_id='${user(8)}'`), "t");
  sql(`UPDATE public.subscriptions SET has_access=true, expires_at=NULL WHERE user_id='${user(9)}'`);
  rejects(user(9), "SELECT public.redeem_membership_coupon('WELCOME-SEVEN')", "already have unlimited");
  sql(`UPDATE public.membership_coupons SET expires_at=now()-interval '1 second' WHERE id='${batch[1].id}'`);
  rejects(user(10), `SELECT public.redeem_membership_coupon('${batch[1].code}')`, "expired");
  rpc(admin, `SELECT public.admin_revoke_membership_coupon('${batch[2].id}')`);
  rejects(user(10), `SELECT public.redeem_membership_coupon('${batch[2].code}')`, "revoked");
  sql(`DELETE FROM public.subscriptions WHERE user_id='${user(11)}'`);
  rejects(user(11), "SELECT public.redeem_membership_coupon('WELCOME-SEVEN')", "Membership record");
  assert.equal(sql(`SELECT count(*) FROM public.coupon_redemptions WHERE user_id='${user(11)}'`), "0");
  sql(`INSERT INTO auth.mfa_factors VALUES ('${admin}','verified')`);
  rejects(admin, "SELECT public.admin_generate_membership_coupons(1,'day',false,NULL)", "Two-factor");
  assert.equal(sql("SELECT has_function_privilege('anon','public.redeem_membership_coupon(text)','EXECUTE')"), "f");
  console.log("PASS: PostgreSQL coupon permissions, generation, expiry, redemption, retries, concurrency, paid preservation, RLS, MFA, and rollback.");
} finally {
  execFileSync("dropdb", ["--force", database]);
}
