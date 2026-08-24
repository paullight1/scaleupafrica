import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { newsletterAdmin } from "@/lib/newsletter/api";
import type { AudienceFilter, CampaignBlock, CampaignStatus } from "@/lib/newsletter/types";

export interface NewsletterOverview {
  activeSubscribers: number;
  unsubscribedSubscribers: number;
  newSubscribers30d: number;
  delivered30d: number;
  clicked30d: number;
  unsubscribed30d: number;
  deliveryRate: number;
  clickRate: number;
  failedSyncCount: number;
  configured: boolean;
  recentCampaigns: CampaignSummary[];
}

export interface SubscriberRow {
  id: string;
  email: string;
  status: "subscribed" | "unsubscribed";
  source: string | null;
  consent_source: string | null;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  unsubscribe_reason: string | null;
  brevo_sync_status: "pending" | "synced" | "failed" | "suppressed";
  brevo_synced_at: string | null;
  brevo_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsentEvent {
  id: string;
  event_type: string;
  source: string | null;
  reason: string | null;
  actor_user_id: string | null;
  created_at: string;
}

export interface SubscriberFilters {
  page: number;
  pageSize: number;
  q: string;
  status: string;
  sync: string;
  source: string;
  joinedAfter: string;
  joinedBefore: string;
}

export interface SubscriberPage {
  rows: SubscriberRow[];
  total: number;
  page: number;
  pageSize: number;
  sources: string[];
}

export interface CampaignSummary {
  id: string;
  internal_name: string;
  subject: string;
  status: CampaignStatus;
  revision: number;
  estimated_recipient_count: number | null;
  final_recipient_count: number | null;
  last_test_status: "sent" | "failed" | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRow extends CampaignSummary {
  preview_text: string;
  sender_name: string;
  sender_email: string;
  reply_to: string;
  content_blocks: CampaignBlock[];
  audience_filter: AudienceFilter;
  last_test_email: string | null;
  last_test_revision: number | null;
  last_tested_at: string | null;
  provider_error: string | null;
}

export interface CampaignDraftPayload {
  internalName: string;
  subject: string;
  previewText: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  blocks: CampaignBlock[];
  audience: AudienceFilter;
}

export interface AudienceEstimate {
  count: number;
  sample: Array<{ email: string; source: string | null; subscribedAt: string | null }>;
}

export interface NewsletterHealth {
  configured: boolean;
  connected: boolean;
  error?: string | null;
  listId: number | null;
  senderId: number | null;
  lastWebhookAt?: string | null;
  lastSyncAt?: string | null;
}

export interface CampaignReport {
  campaign: CampaignRow;
  counts: Record<string, number>;
  events: Array<{ event_type: string; event_at: string; recipient_email: string; clicked_url: string | null; reason: string | null }>;
}

export const newsletterKeys = {
  all: ["admin", "newsletter"] as const,
  overview: () => [...newsletterKeys.all, "overview"] as const,
  subscribers: (filters: SubscriberFilters) => [...newsletterKeys.all, "subscribers", filters.page, filters.pageSize, filters.q, filters.status, filters.sync, filters.source, filters.joinedAfter, filters.joinedBefore] as const,
  consent: (id: string) => [...newsletterKeys.all, "consent", id] as const,
  campaigns: (status: string, q: string) => [...newsletterKeys.all, "campaigns", status, q] as const,
  campaign: (id: string) => [...newsletterKeys.all, "campaign", id] as const,
  audience: (audience: AudienceFilter) => [...newsletterKeys.all, "audience", audience.mode, audience.sources.join("|"), audience.joinedAfter, audience.joinedBefore] as const,
  report: (id: string) => [...newsletterKeys.all, "report", id] as const,
  health: () => [...newsletterKeys.all, "health"] as const,
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Newsletter operation failed";
}

export function useNewsletterOverview() {
  return useQuery({ queryKey: newsletterKeys.overview(), queryFn: () => newsletterAdmin<NewsletterOverview>("overview") });
}

export function useNewsletterSubscribers(filters: SubscriberFilters) {
  return useQuery({ queryKey: newsletterKeys.subscribers(filters), queryFn: () => newsletterAdmin<SubscriberPage>("subscribers.list", { ...filters }), placeholderData: (previous) => previous });
}

export function useSubscriberConsent(id: string | null) {
  return useQuery({ queryKey: newsletterKeys.consent(id ?? ""), queryFn: () => newsletterAdmin<{ rows: ConsentEvent[] }>("subscriber.consent", { id }), enabled: Boolean(id) });
}

export function useNewsletterCampaigns(status: string, q: string) {
  return useQuery({ queryKey: newsletterKeys.campaigns(status, q), queryFn: () => newsletterAdmin<{ rows: CampaignSummary[] }>("campaigns.list", { status, q }) });
}

export function useNewsletterCampaign(id: string | null) {
  return useQuery({ queryKey: newsletterKeys.campaign(id ?? ""), queryFn: () => newsletterAdmin<CampaignRow>("campaign.get", { id }), enabled: Boolean(id) });
}

export function useAudienceEstimate(audience: AudienceFilter, enabled = true) {
  return useQuery({ queryKey: newsletterKeys.audience(audience), queryFn: () => newsletterAdmin<AudienceEstimate>("audience.estimate", { audience }), enabled, staleTime: 15_000 });
}

export function useCampaignReport(id: string | null) {
  return useQuery({ queryKey: newsletterKeys.report(id ?? ""), queryFn: () => newsletterAdmin<CampaignReport>("campaign.report", { id }), enabled: Boolean(id) });
}

export function useNewsletterHealth() {
  return useQuery({ queryKey: newsletterKeys.health(), queryFn: () => newsletterAdmin<NewsletterHealth>("settings.health"), refetchInterval: 60_000 });
}

export function useAddSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => newsletterAdmin("subscriber.add", { email, consentConfirmed: true }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: newsletterKeys.all }); toast.success("Subscriber added and queued for Brevo"); },
    onError: (error) => toast.error(message(error)),
  });
}

export function useSetSubscriberStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, consentConfirmed = false }: { id: string; status: "subscribed" | "unsubscribed"; consentConfirmed?: boolean }) => newsletterAdmin("subscriber.status", { id, status, consentConfirmed }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: newsletterKeys.all }); toast.success("Subscriber consent updated"); },
    onError: (error) => toast.error(message(error)),
  });
}

export function useRetrySubscriberSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => newsletterAdmin("subscriber.retry", { id }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: newsletterKeys.all }); toast.success("Brevo sync retried"); },
    onError: (error) => toast.error(message(error)),
  });
}

export function useSaveNewsletterCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: CampaignDraftPayload }) => newsletterAdmin<CampaignRow>("campaign.save", { id, values }),
    onSuccess: (campaign) => { void qc.invalidateQueries({ queryKey: newsletterKeys.all }); qc.setQueryData(newsletterKeys.campaign(campaign.id), campaign); },
    onError: (error) => toast.error(message(error)),
  });
}

export function useDuplicateNewsletterCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => newsletterAdmin<CampaignRow>("campaign.duplicate", { id }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: newsletterKeys.all }); toast.success("Campaign duplicated as a draft"); },
    onError: (error) => toast.error(message(error)),
  });
}

export function useSendCampaignTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) => newsletterAdmin<{ sent: true; revision: number; email: string }>("campaign.test", { id, email }),
    onSuccess: (_result, input) => { void qc.invalidateQueries({ queryKey: newsletterKeys.campaign(input.id) }); toast.success("Test email sent"); },
    onError: (error) => toast.error(message(error)),
  });
}

export function useDeliverNewsletterCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt?: string | null }) => newsletterAdmin("campaign.deliver", { id, scheduledAt }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: newsletterKeys.all }); toast.success("Campaign queued in Brevo"); },
    onError: (error) => toast.error(message(error)),
  });
}

export function useCancelNewsletterCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => newsletterAdmin("campaign.cancel", { id }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: newsletterKeys.all }); toast.success("Scheduled campaign cancelled"); },
    onError: (error) => toast.error(message(error)),
  });
}

export function useResyncNewsletterAudience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => newsletterAdmin<{ processed: number; synced: number; remaining: number }>("settings.resync"),
    onSuccess: (result) => { void qc.invalidateQueries({ queryKey: newsletterKeys.all }); toast.success(`${result.synced} contacts synchronized`); },
    onError: (error) => toast.error(message(error)),
  });
}
