import { useState } from "react";
import { Copy, Download, Eye, RefreshCw, Ticket, X } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { ErrorState } from "@shared/components/common/ErrorState";
import { LoadingState } from "@shared/components/common/LoadingState";
import { siteUrl } from "@shared/lib/crossApp";
import { couponCardSvg, couponStatus, downloadCouponCard, type CouponExpiry, type MembershipCoupon } from "@shared/lib/coupons";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { COUPON_PAGE_SIZE, useAdminCoupons, useGenerateCoupons, useRevokeCoupon } from "@/hooks/queries/coupons";

export default function AdminCoupons() {
  const [count, setCount] = useState("1");
  const [expiry, setExpiry] = useState<CouponExpiry>("week");
  const [unlimited, setUnlimited] = useState(false);
  const [code, setCode] = useState("");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<MembershipCoupon | null>(null);
  const [batch, setBatch] = useState<MembershipCoupon[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const query = useAdminCoupons(page, search);
  const generate = useGenerateCoupons();
  const revoke = useRevokeCoupon();
  const selectedFresh = query.data?.coupons.find((coupon) => coupon.id === selected?.id) ?? selected;
  const preview = selectedFresh ?? query.data?.coupons[0];
  const redeemUrl = new URL(siteUrl("/dashboard/account/membership"), window.location.origin).href;
  const previewCoupon = preview ?? { code: "YOUR-GUEST-PASS", expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), max_redemptions: unlimited ? null : 1 };

  async function action(work: () => Promise<void>) {
    setError(""); setMessage("");
    try { await work(); } catch (err) { setError(err instanceof Error ? err.message : "Could not complete that action. Please try again."); }
  }
  async function copy(text: string) {
    await action(async () => { await navigator.clipboard.writeText(text); setMessage("Copied to clipboard."); });
  }
  async function download(coupon: MembershipCoupon, format: "png" | "svg") {
    setDownloading(true);
    await action(async () => { await downloadCouponCard(coupon, redeemUrl, format); setMessage("Your branded card is ready to download."); });
    setDownloading(false);
  }
  const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-7">
      <StudioPageHeader eyebrow="Membership invitations" title="Coupons" description="Give your community seven days to explore The Collective." actions={<Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className="h-4 w-4" />Refresh</Button>} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)]">
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="rounded-lg bg-primary/15 p-2.5"><Ticket className="h-5 w-5 text-primary-dark" /></span><div><h2 className="font-display text-xl font-semibold">Create guest passes</h2><p className="text-sm text-muted-foreground">7 days free with every redemption.</p></div></div>
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            if (generate.isPending) return;
            void action(async () => {
              const created = await generate.mutateAsync({ count: Number(count), expiry, unlimited, code: Number(count) === 1 ? code : "" });
              setBatch(created); setSelected(created[0]); setPage(0); setSearch(""); setSearchInput("");
              setMessage(`${created.length} ${created.length === 1 ? "coupon created" : "coupons created"}. Ready to share.`);
            });
          }}>
            <div><label htmlFor="coupon-count" className="mb-2 block text-sm font-medium">Number of coupons</label><Input id="coupon-count" type="number" min="1" max="500" step="1" value={count} onChange={(event) => setCount(event.target.value)} required /><p className="mt-1.5 text-xs text-muted-foreground">Up to 500 in each batch. Create as many batches as you need.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="coupon-expiry" className="mb-2 block text-sm font-medium">Redemption deadline</label><select id="coupon-expiry" className={selectClass} value={expiry} onChange={(event) => setExpiry(event.target.value as CouponExpiry)}><option value="day">1 day</option><option value="week">1 week</option><option value="month">1 month</option></select></div>
              <div><label htmlFor="coupon-usage" className="mb-2 block text-sm font-medium">Usage limit</label><select id="coupon-usage" className={selectClass} value={unlimited ? "unlimited" : "single"} onChange={(event) => setUnlimited(event.target.value === "unlimited")}><option value="single">Single use</option><option value="unlimited">Unlimited uses</option></select></div>
            </div>
            {Number(count) === 1 && <div><label htmlFor="custom-coupon" className="mb-2 block text-sm font-medium">Custom code <span className="font-normal text-muted-foreground">(optional)</span></label><Input id="custom-coupon" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={32} minLength={4} pattern="[A-Za-z0-9][A-Za-z0-9-]{3,31}" placeholder="e.g. WELCOME-SEVEN" autoComplete="off" className="font-mono uppercase" /><p className="mt-1.5 text-xs text-muted-foreground">Leave blank for a secure, unique code.</p></div>}
            <p className="rounded-lg bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">The deadline starts when you generate the code. Members receive seven days from redemption, even if the code expires sooner. {unlimited ? "Anyone with the shared code can redeem it once per account." : "Only one account can redeem each code."}</p>
            <Button type="submit" className="w-full" disabled={generate.isPending}>{generate.isPending ? "Generating…" : "Generate coupons"}</Button>
          </form>
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">{preview ? "Your branded guest pass" : "Card preview · sample code"}</h2>{preview && <Badge variant={couponStatus(preview) === "Available" ? "success" : "secondary"}>{couponStatus(preview)}</Badge>}</div>
          <img className="w-full rounded-xl border border-border shadow-soft" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(couponCardSvg(previewCoupon, redeemUrl))}`} alt={`Cresciva seven-day guest pass${preview ? `: ${preview.code}` : " preview"}`} width={1200} height={760} />
          {preview && <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" disabled={downloading} onClick={() => void download(preview, "png")}><Download className="h-4 w-4" />Download PNG</Button><Button variant="outline" disabled={downloading} onClick={() => void download(preview, "svg")}>Download SVG</Button><Button variant="outline" onClick={() => void copy(preview.code)}><Copy className="h-4 w-4" />Copy code</Button></div>}
          <p className="mt-3 text-xs text-muted-foreground">A crisp, shareable card for WhatsApp, social media, or print. Each card includes its redemption deadline in UTC.</p>
        </section>
      </div>

      <div aria-live="polite">{error && <p role="alert" className="rounded-lg border border-destructive/30 bg-card p-4 text-sm text-destructive-strong">{error}</p>}{message && <p role="status" className="rounded-lg border border-success/30 bg-card p-4 text-sm text-success-strong">{message}</p>}</div>
      {batch.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"><p className="text-sm"><strong>{batch.length} coupons</strong> in your latest batch. Copy all codes to share individually.</p><Button variant="outline" onClick={() => void copy(batch.map((coupon) => coupon.code).join("\n"))}><Copy className="h-4 w-4" />Copy batch codes</Button></div>}

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5"><div><h2 className="font-display text-xl font-semibold">Coupon library</h2><p className="mt-1 text-sm text-muted-foreground">{query.data?.total ?? "—"} coupons{search ? " matching your search" : " created"}. Revoking a code prevents new redemptions.</p></div><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setPage(0); setSearch(searchInput); }}><Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Find a code" aria-label="Find a coupon code" /><Button type="submit" variant="outline">Search</Button></form></div>
        {query.isLoading ? <LoadingState label="Loading coupons…" /> : query.isError ? <ErrorState title="Couldn't load coupons" message="Check your connection and try again." onRetry={() => void query.refetch()} /> : <>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Code</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Redemptions</th><th className="px-5 py-3">Redeem by</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-border">{query.data?.coupons.map((coupon) => <tr key={coupon.id}><td className="px-5 py-4 font-mono text-xs font-semibold">{coupon.code}</td><td className="px-5 py-4"><Badge variant={couponStatus(coupon) === "Available" ? "success" : "secondary"}>{couponStatus(coupon)}</Badge></td><td className="px-5 py-4">{coupon.redemption_count.toLocaleString()} / {coupon.max_redemptions ?? "Unlimited"}</td><td className="whitespace-nowrap px-5 py-4 text-xs">{new Date(coupon.expires_at).toLocaleString()}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label={`Preview ${coupon.code}`} onClick={() => setSelected(coupon)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={`Copy ${coupon.code}`} onClick={() => void copy(coupon.code)}><Copy className="h-4 w-4" /></Button><Button variant="ghost" size="icon" disabled={downloading} aria-label={`Download ${coupon.code}`} onClick={() => void download(coupon, "png")}><Download className="h-4 w-4" /></Button><Button variant="ghost" size="icon" disabled={revoke.isPending || couponStatus(coupon) !== "Available"} aria-label={`Revoke ${coupon.code}`} onClick={() => void action(async () => { await revoke.mutateAsync(coupon.id); setSelected((current) => current?.id === coupon.id ? { ...current, active: false } : current); setMessage("Coupon revoked. Existing redeemed access is preserved."); })}><X className="h-4 w-4" /></Button></div></td></tr>)}{query.data?.coupons.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">{search ? "No matching codes found." : "No coupons yet. Generate your first guest passes above."}</td></tr>}</tbody></table></div>
          <div className="flex items-center justify-between border-t border-border p-4"><Button variant="outline" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page + 1} of {Math.max(1, Math.ceil((query.data?.total ?? 0) / COUPON_PAGE_SIZE))}</span><Button variant="outline" disabled={(page + 1) * COUPON_PAGE_SIZE >= (query.data?.total ?? 0)} onClick={() => setPage((current) => current + 1)}>Next</Button></div>
        </>}
      </section>
    </div>
  );
}
