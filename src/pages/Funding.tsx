import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, ExternalLink, Lock, RefreshCw, Calendar,
  AlertTriangle, ShieldAlert, ChevronDown, ChevronUp, Info, Target, Users, Lightbulb, Plane,
} from "lucide-react";

type Recipient = { business_name: string; founder_name: string; website: string; note: string };
type Opportunity = {
  title: string;
  funder: string;
  type?: string;
  summary: string;
  amount: string;
  opens?: string;
  deadline: string;
  eligibility: string;
  url: string;
  tags: string[];
  funder_about?: string;
  sdg_focus?: string[];
  past_recipients?: Recipient[];
  application_tips?: string[];
  travel_component?: string;
  important_notes?: string;
};

const SAMPLE_OPPS: Opportunity[] = [
  {
    title: "Africa Climate Innovation Grant",
    funder: "Green Africa Foundation",
    type: "Grant",
    summary: "Non-dilutive grant for climate-focused African SMEs building scalable solutions in agriculture, energy or water.",
    amount: "Up to $50,000",
    opens: "January (annual)",
    deadline: "31 March (annual)",
    eligibility: "Revenue-generating SMEs in Africa",
    url: "https://example.com",
    tags: ["Grant", "Climate"],
    funder_about: "A sample foundation supporting climate innovation across Africa since 2015.",
    sdg_focus: ["SDG 13: Climate Action", "SDG 7: Affordable Energy"],
    past_recipients: [],
    application_tips: ["Lead with measurable climate impact", "Show a clear path to scale", "Include local partnerships"],
    important_notes: "Sample data — subscribe to see live curated opportunities.",
  },
  {
    title: "Mandela Washington Fellowship",
    funder: "U.S. Department of State",
    type: "Fellowship",
    summary: "Flagship fellowship of the Young African Leaders Initiative (YALI) with a 6-week U.S. leadership institute.",
    amount: "Fully funded",
    opens: "September (annual)",
    deadline: "Early October (annual)",
    eligibility: "Africans aged 25-35",
    url: "https://example.com",
    tags: ["Fellowship", "Travel", "Leadership"],
    travel_component: "6 weeks in the U.S. at a host university plus optional professional development experience.",
    application_tips: ["Tell a specific story of community impact", "Be concrete about your growth goals"],
  },
];

const Funding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isPreview = params.get("preview") === "1";
  const [access, setAccess] = useState<null | boolean>(null);
  const [keywords, setKeywords] = useState("");
  const [opps, setOpps] = useState<Opportunity[]>(isPreview ? SAMPLE_OPPS : []);
  const [fetching, setFetching] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Funding Intelligence | ScaleUp Africa Collective";
    if (isPreview) return;
    if (!loading && !user) navigate("/auth?next=/funding", { replace: true });
  }, [user, loading, navigate, isPreview]);

  useEffect(() => {
    if (isPreview) { setAccess(true); return; }
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("subscriptions").select("has_access, expires_at").eq("user_id", user.id).maybeSingle();
      const active = !!data?.has_access && (!data.expires_at || new Date(data.expires_at) > new Date());
      setAccess(active);
    })();
  }, [user, isPreview]);

  const generate = async () => {
    if (isPreview) {
      setOpps(SAMPLE_OPPS);
      toast.info("Preview mode — showing sample opportunities.");
      return;
    }
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

  if (!isPreview && (loading || !user || access === null)) {
    return <main className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></main>;
  }

  if (!access) {
    return (
      <main className="min-h-screen bg-secondary flex items-center justify-center px-6 py-24">
        <div className="max-w-xl w-full rounded-3xl border border-border bg-card p-10 shadow-elevated">
          <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-forest text-primary-foreground flex items-center justify-center">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground mb-3 text-center">Members only</h1>
          <p className="text-muted-foreground mb-6 text-center">
            The Funding Radar is available to active Collective members. Before you subscribe, please read and accept the notice below.
          </p>

          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-5 mb-5 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-gold-dark shrink-0 mt-0.5" />
              <div className="text-sm text-foreground/80 space-y-2">
                <p>
                  <strong>Please note:</strong> A given search may not always surface opportunities you are eligible for, or that are open right now. Most reputable grants and fellowships run on an <strong>annual cycle</strong> — if this year's deadline has passed, the same opportunity typically reopens next year, so bookmark those that fit you.
                </p>
                <p className="flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-gold-dark shrink-0 mt-0.5" />
                  <span>
                    <strong>Fraud warning:</strong> Opportunities are curated to be real and verifiable, but always do further research. <strong>Never pay a fee to apply for or receive a grant</strong> — that is a strong signal it is fraudulent.
                  </span>
                </p>
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer pt-3 border-t border-gold/20">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(v) => setAcknowledged(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground/80">
                I understand results may vary by cycle, I will do my own due diligence, and I will never pay to apply for or receive a grant.
              </span>
            </label>
          </div>

          <div className="text-center">
            {acknowledged ? (
              <Link to="/#pricing"><Button variant="gold" size="lg">See membership</Button></Link>
            ) : (
              <Button variant="gold" size="lg" disabled>See membership</Button>
            )}
          </div>
          {user && <p className="mt-6 text-xs text-muted-foreground text-center">Signed in as {user.email}</p>}
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
            Enter keywords describing your business or the funding you're looking for. Our AI aggregates grants, competitions, accelerators and fellowships (including travel opportunities) relevant to African SMEs.
          </p>


          <div className="rounded-2xl border border-gold/20 bg-primary-foreground/5 p-4 mb-6 text-xs text-primary-foreground/80 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-gold shrink-0 mt-0.5" />
            <span>
              Reminder: verify each opportunity on the funder's own site before applying, and <strong>never pay a fee</strong> to apply for or receive a grant.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. agritech Nigeria climate grant fellowship"
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
          {opps.map((o, i) => {
            const isOpen = expanded === i;
            return (
              <article key={i} className="rounded-2xl border border-border bg-card p-6 shadow-soft hover:border-gold/40 transition-all">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {o.type && <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-semibold text-forest">{o.type}</span>}
                      {o.travel_component && <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold-dark"><Plane className="h-3 w-3" /> Travel</span>}
                    </div>
                    <h3 className="font-serif text-xl font-bold text-foreground mb-1">{o.title}</h3>
                    <p className="text-sm text-muted-foreground">by {o.funder}</p>
                  </div>
                  {o.amount && <span className="shrink-0 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-dark">{o.amount}</span>}
                </div>
                <p className="text-sm text-foreground/80 mb-4">{o.summary}</p>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
                  {o.opens && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Opens: {o.opens}</span>}
                  {o.deadline && <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Calendar className="h-3 w-3" /> Deadline: {o.deadline}</span>}
                  {o.eligibility && <span>Eligibility: {o.eligibility}</span>}
                </div>
                {o.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {o.tags.map((t) => <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{t}</span>)}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpanded(isOpen ? null : i)}
                  >
                    {isOpen ? <><ChevronUp className="mr-1 h-4 w-4" /> Show less</> : <><ChevronDown className="mr-1 h-4 w-4" /> Learn more</>}
                  </Button>
                </div>

                {isOpen && (
                  <div className="mt-6 space-y-5 border-t border-border pt-6">
                    {o.funder_about && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-forest mb-2"><Info className="h-4 w-4" /> About the funder</h4>
                        <p className="text-sm text-foreground/80">{o.funder_about}</p>
                      </div>
                    )}
                    {o.travel_component && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-forest mb-2"><Plane className="h-4 w-4" /> Travel / exchange component</h4>
                        <p className="text-sm text-foreground/80">{o.travel_component}</p>
                      </div>
                    )}
                    {o.sdg_focus && o.sdg_focus.length > 0 && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-forest mb-2"><Target className="h-4 w-4" /> SDG focus</h4>
                        <div className="flex flex-wrap gap-2">
                          {o.sdg_focus.map((s) => <span key={s} className="rounded-full bg-forest/10 px-2.5 py-0.5 text-xs text-forest">{s}</span>)}
                        </div>
                      </div>
                    )}
                    {o.past_recipients && o.past_recipients.length > 0 && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-forest mb-2"><Users className="h-4 w-4" /> Businesses previously funded</h4>
                        <ul className="space-y-2">
                          {o.past_recipients.map((r, idx) => (
                            <li key={idx} className="text-sm text-foreground/80">
                              <span className="font-semibold text-foreground">{r.business_name}</span>
                              {r.founder_name && <> — founded by {r.founder_name}</>}
                              {r.website && <> · <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-forest hover:text-gold underline-offset-4 hover:underline">website</a></>}
                              {r.note && <div className="text-muted-foreground text-xs mt-0.5">{r.note}</div>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {o.application_tips && o.application_tips.length > 0 && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-forest mb-2"><Lightbulb className="h-4 w-4" /> Tips for a stellar application</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80">
                          {o.application_tips.map((t, idx) => <li key={idx}>{t}</li>)}
                        </ul>
                      </div>
                    )}
                    {o.important_notes && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-forest mb-2"><Info className="h-4 w-4" /> Important to note</h4>
                        <p className="text-sm text-foreground/80">{o.important_notes}</p>
                      </div>
                    )}

                    <div className="rounded-lg bg-gold/10 p-3 text-xs text-foreground/80 flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 text-gold-dark shrink-0 mt-0.5" />
                      <span>Verify the current cycle on the funder's site before applying. Never pay any fee to apply for or receive a grant — legitimate funders do not charge applicants.</span>
                    </div>

                    {o.url && (
                      <a href={o.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="gold" size="sm">
                          Visit funder site <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default Funding;
