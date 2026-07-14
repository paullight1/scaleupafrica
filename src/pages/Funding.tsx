import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, ExternalLink, Lock, RefreshCw, Calendar } from "lucide-react";

const SAMPLE_OPPS: Opportunity[] = [
  { title: "Africa Climate Innovation Grant", funder: "Green Africa Foundation", summary: "Non-dilutive grant for climate-focused African SMEs building scalable solutions in agriculture, energy or water.", amount: "Up to $50,000", deadline: "Rolling", eligibility: "Revenue-generating SMEs in Africa", url: "https://example.com", tags: ["Grant", "Climate", "Africa-wide"] },
  { title: "Women Founders Growth Fund", funder: "AfriVentures", summary: "Equity-free capital and mentorship for women-led SMEs scaling across West and East Africa.", amount: "$25,000 + mentorship", deadline: "March 31, 2026", eligibility: "Women-led, 2+ years revenue", url: "https://example.com", tags: ["Grant", "Women-led"] },
  { title: "Pan-African Agritech Challenge", funder: "AGRA & partners", summary: "Competition for agritech startups improving smallholder farmer productivity across the continent.", amount: "$100,000 prize pool", deadline: "May 15, 2026", eligibility: "Agritech, post-revenue", url: "https://example.com", tags: ["Competition", "Agritech"] },
];

type Opportunity = {
  title: string;
  funder: string;
  summary: string;
  amount: string;
  deadline: string;
  eligibility: string;
  url: string;
  tags: string[];
};

const Funding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [access, setAccess] = useState<null | boolean>(null);
  const [keywords, setKeywords] = useState("");
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    document.title = "Funding Intelligence | ScaleUp Africa Collective";
    if (!loading && !user) navigate("/auth?next=/funding", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("subscriptions").select("has_access, expires_at").eq("user_id", user.id).maybeSingle();
      const active = !!data?.has_access && (!data.expires_at || new Date(data.expires_at) > new Date());
      setAccess(active);
    })();
  }, [user]);

  const generate = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("aggregate-funding", {
        body: { keywords: keywords.trim() || "African SMEs" },
      });
      if (error) throw error;
      setOpps(data?.opportunities ?? []);
      if (!data?.opportunities?.length) toast.info("No opportunities returned. Try different keywords.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch opportunities");
    } finally {
      setFetching(false);
    }
  };

  if (loading || !user || access === null) {
    return <main className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></main>;
  }

  if (!access) {
    return (
      <main className="min-h-screen bg-secondary flex items-center justify-center px-6 py-24">
        <div className="max-w-lg w-full rounded-3xl border border-border bg-card p-10 text-center shadow-elevated">
          <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-forest text-primary-foreground flex items-center justify-center">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground mb-3">Members only</h1>
          <p className="text-muted-foreground mb-6">
            The Funding Intelligence page is available to active Collective members. Subscribe to unlock AI-curated grants and opportunities matched to your keywords.
          </p>
          <Link to="/#pricing"><Button variant="gold" size="lg">See membership</Button></Link>
          <p className="mt-6 text-xs text-muted-foreground">Signed in as {user.email}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-16 px-6">
        <div className="mx-auto max-w-5xl">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-gold text-sm mb-6">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold mb-4">
            <Sparkles className="h-3 w-3" /> AI-powered
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3">
            The <span className="text-gradient-gold">Funding Radar</span>
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl mb-8">
            Enter keywords describing your business or the funding you're looking for. Our AI aggregates and curates relevant opportunities for African SMEs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. agritech Nigeria climate grant"
              maxLength={200}
              className="h-12 bg-card text-foreground"
            />
            <Button variant="gold" size="lg" onClick={generate} disabled={fetching}>
              {fetching ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Curating...</> : "Find opportunities"}
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16">
        {opps.length === 0 && !fetching && (
          <p className="text-center text-muted-foreground py-16">
            Enter keywords above and press "Find opportunities" to generate a curated list.
          </p>
        )}
        <div className="grid gap-6">
          {opps.map((o, i) => (
            <article key={i} className="rounded-2xl border border-border bg-card p-6 shadow-soft hover:border-gold/40 transition-all">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-serif text-xl font-bold text-foreground mb-1">{o.title}</h3>
                  <p className="text-sm text-muted-foreground">by {o.funder}</p>
                </div>
                {o.amount && <span className="shrink-0 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-dark">{o.amount}</span>}
              </div>
              <p className="text-sm text-foreground/80 mb-4">{o.summary}</p>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
                {o.deadline && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {o.deadline}</span>}
                {o.eligibility && <span>Eligibility: {o.eligibility}</span>}
              </div>
              {o.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {o.tags.map((t) => <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{t}</span>)}
                </div>
              )}
              {o.url && (
                <a href={o.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-gold">
                  Learn more <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Funding;
