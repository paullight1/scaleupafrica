import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Loader2, Save, Send, UsersRound } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { Separator } from "@shared/components/ui/separator";
import { useAudienceEstimate, useCampaignReport, useDeliverNewsletterCampaign, useNewsletterCampaign, useSaveNewsletterCampaign, useSendCampaignTest, type CampaignDraftPayload, type CampaignRow } from "@/hooks/queries/adminNewsletter";
import { renderNewsletter } from "@/lib/newsletter/render";
import AudienceBuilder from "./AudienceBuilder";
import CampaignComposer from "./CampaignComposer";
import CampaignPreview from "./CampaignPreview";
import DeliveryReview from "./DeliveryReview";

type Step = "compose" | "audience" | "review";
const empty: CampaignDraftPayload = { internalName: "", subject: "", previewText: "", senderName: "Cresciva", senderEmail: "hello@cresciva.com", replyTo: "hello@cresciva.com", blocks: [], audience: { mode: "all", sources: [], joinedAfter: null, joinedBefore: null } };
function fromRow(row: CampaignRow): CampaignDraftPayload { return { internalName: row.internal_name, subject: row.subject, previewText: row.preview_text, senderName: row.sender_name, senderEmail: row.sender_email, replyTo: row.reply_to, blocks: row.content_blocks, audience: row.audience_filter }; }

export default function CampaignStudio({ open, campaignId, onOpenChange }: { open: boolean; campaignId: string | null; onOpenChange: (open: boolean) => void }) {
  const query = useNewsletterCampaign(campaignId);
  const [draft, setDraft] = useState<CampaignDraftPayload>(empty);
  const [step, setStep] = useState<Step>("compose");
  const [savedId, setSavedId] = useState<string | null>(campaignId);
  const [revision, setRevision] = useState(1);
  const [testedRevision, setTestedRevision] = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [dirty, setDirty] = useState(false);
  const save = useSaveNewsletterCampaign();
  const test = useSendCampaignTest();
  const deliver = useDeliverNewsletterCampaign();
  const estimate = useAudienceEstimate(draft.audience, open);
  const report = useCampaignReport(query.data?.status !== "draft" ? campaignId : null);
  const effectiveId = campaignId ?? savedId;
  const readonly = Boolean(query.data && query.data.status !== "draft");

  useEffect(() => { if (!open) return; setStep("compose"); setSavedId(campaignId); if (query.data) { setDraft(fromRow(query.data)); setRevision(query.data.revision); setTestedRevision(query.data.last_test_status === "sent" && query.data.last_test_revision === query.data.revision ? query.data.revision : null); setTestEmail(query.data.last_test_email ?? ""); setDirty(false); } else if (!campaignId) { setDraft(empty); setRevision(1); setTestedRevision(null); setTestEmail(""); setDirty(false); } }, [open, campaignId, query.data]);
  useEffect(() => { if (!dirty || !effectiveId || readonly) return; const timer = window.setTimeout(() => save.mutate({ id: effectiveId, values: draft }, { onSuccess: (row) => { setRevision(row.revision); setTestedRevision(null); setDirty(false); } }), 1_000); return () => window.clearTimeout(timer); }, [dirty, effectiveId, draft, readonly]); // eslint-disable-line react-hooks/exhaustive-deps

  const rendered = useMemo(() => renderNewsletter({ subject: draft.subject || "Untitled Cresciva dispatch", previewText: draft.previewText, blocks: draft.blocks }), [draft.subject, draft.previewText, draft.blocks]);
  const updateDraft = (next: CampaignDraftPayload) => { setDraft(next); setTestedRevision(null); setDirty(true); };
  const saveNow = () => save.mutate({ id: effectiveId ?? undefined, values: draft }, { onSuccess: (row) => { setSavedId(row.id); setRevision(row.revision); setTestedRevision(row.last_test_status === "sent" ? row.revision : null); setDirty(false); } });
  const canCompose = draft.internalName.trim() && draft.subject.trim() && draft.senderName.trim() && draft.senderEmail.trim() && draft.replyTo.trim();
  const tested = testedRevision === revision;
  const title = readonly ? query.data?.internal_name ?? "Campaign report" : effectiveId ? "Edit campaign" : "Create campaign";
  const stepButton = (value: Step, label: string, Icon: typeof Eye) => <Button type="button" variant={step === value ? "default" : "ghost"} onClick={() => setStep(value)} aria-label={label} disabled={readonly && value !== "review"}><Icon className="h-4 w-4" />{label}</Button>;

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex h-[92vh] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 xl:max-w-7xl"><DialogHeader className="border-b border-border px-6 py-5"><div className="flex flex-wrap items-center justify-between gap-3 pr-8"><div><DialogTitle className="font-display text-xl">{title}</DialogTitle><DialogDescription>{readonly ? "Sent campaigns are immutable. Delivery events update the report below." : "Structured content, precise audience and proof-before-send delivery."}</DialogDescription></div><div className="flex items-center gap-2">{dirty && <Badge variant="warning">Unsaved changes</Badge>}{save.isPending && <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Saving</Badge>}{!readonly && <Button variant="outline" onClick={saveNow} disabled={!canCompose || save.isPending}><Save className="h-4 w-4" />Save draft</Button>}</div></div></DialogHeader><div className="flex flex-wrap gap-2 border-b border-border bg-secondary/40 px-6 py-3">{stepButton("compose", "Compose", Eye)}{stepButton("audience", "Audience", UsersRound)}{stepButton("review", "Review & deliver", Send)}</div><div className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-6">
    {query.isLoading ? <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : readonly ? <div className="mx-auto max-w-4xl space-y-5"><div className="grid gap-3 sm:grid-cols-4">{["delivered", "opened", "clicked", "unsubscribed"].map((event) => <div key={event} className="rounded-xl border border-border bg-card p-4"><p className="text-xs capitalize text-muted-foreground">{event}</p><p className="mt-2 font-display text-2xl font-bold">{report.data?.counts[event] ?? 0}</p></div>)}</div><CampaignPreview html={rendered.html} /></div> : step === "compose" ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,.85fr)]"><CampaignComposer value={draft} onChange={updateDraft} /><CampaignPreview html={rendered.html} /></div> : step === "audience" ? <AudienceBuilder value={draft.audience} onChange={(audience) => updateDraft({ ...draft, audience })} estimate={estimate.data} loading={estimate.isLoading} /> : <div className="grid gap-6 xl:grid-cols-[minmax(0,.8fr)_minmax(420px,1.2fr)]"><DeliveryReview campaignId={effectiveId} revision={revision} tested={tested && !dirty && !save.isPending} testEmail={testEmail} onTestEmailChange={setTestEmail} onTest={() => effectiveId && test.mutate({ id: effectiveId, email: testEmail }, { onSuccess: (result) => setTestedRevision(result.revision) })} testing={test.isPending} recipientCount={estimate.data?.count ?? 0} scheduledAt={scheduledAt} onScheduleChange={setScheduledAt} onDeliver={(date) => effectiveId && deliver.mutate({ id: effectiveId, scheduledAt: date ?? null }, { onSuccess: () => onOpenChange(false) })} delivering={deliver.isPending} /><CampaignPreview html={rendered.html} /></div>}
  </div><Separator /><div className="flex items-center justify-between px-6 py-3 text-xs text-muted-foreground"><span>{readonly ? "Read-only report" : `Revision ${revision} · ${draft.blocks.length} content blocks`}</span><span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" />Supabase consent · Brevo delivery</span></div></DialogContent></Dialog>;
}
