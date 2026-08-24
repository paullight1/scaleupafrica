import { useEffect, useState } from "react";
import { Plus, RadioTower } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { Button } from "@shared/components/ui/button";
import { Tabs, TabsContent } from "@shared/components/ui/tabs";
import CampaignList from "@/components/newsletter/CampaignList";
import CampaignStudio from "@/components/newsletter/CampaignStudio";
import NewsletterOverview from "@/components/newsletter/NewsletterOverview";
import NewsletterSettings from "@/components/newsletter/NewsletterSettings";
import NewsletterTabs, { type NewsletterView } from "@/components/newsletter/NewsletterTabs";
import SubscriberManager from "@/components/newsletter/SubscriberManager";

const views = new Set<NewsletterView>(["overview", "campaigns", "subscribers", "settings"]);

export default function AdminNewsletter() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("view") as NewsletterView;
  const requestedView = views.has(requested) ? requested : "overview";
  const [view, setView] = useState<NewsletterView>(requestedView);
  const campaignParam = params.get("campaign");
  const campaignId = campaignParam && campaignParam !== "new" ? campaignParam : null;

  useEffect(() => setView(requestedView), [requestedView]);

  const navigate = (patch: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace });
  };

  return <>
    <SEO title="Newsletter command center" noindex />
    <PageHeader
      title="Newsletter command center"
      subtitle="Compose, target and deliver Cresciva dispatches through Brevo—with consent kept in Cresciva."
      breadcrumb={<span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><RadioTower className="h-3.5 w-3.5" />Growth operations</span>}
      actions={<Button onClick={() => navigate({ view: "campaigns", campaign: "new" })}><Plus className="h-4 w-4" />New campaign</Button>}
    />
    <Tabs value={view} onValueChange={(next) => { setView(next as NewsletterView); navigate({ view: next, campaign: null }, true); }} className="mt-6">
      <NewsletterTabs />
      <TabsContent value="overview"><NewsletterOverview /></TabsContent>
      <TabsContent value="campaigns"><CampaignList onOpen={(id) => navigate({ view: "campaigns", campaign: id })} /></TabsContent>
      <TabsContent value="subscribers"><SubscriberManager /></TabsContent>
      <TabsContent value="settings"><NewsletterSettings /></TabsContent>
    </Tabs>
    <CampaignStudio open={Boolean(campaignParam)} campaignId={campaignId} onOpenChange={(open) => !open && navigate({ campaign: null }, true)} />
  </>;
}
