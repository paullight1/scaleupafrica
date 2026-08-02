import { useEffect, useState } from "react";
import type { Json } from "@shared/integrations/supabase/types";
import { useAuth } from "@shared/hooks/useAuth";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { ErrorState } from "@shared/components/common/ErrorState";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import {
  useSiteSettings,
  useSaveSetting,
  readAnnouncement,
  readFeatures,
  ANNOUNCEMENT_DEFAULT,
  FEATURES_DEFAULT,
  type AnnouncementSetting,
  type FeaturesSetting,
} from "@/hooks/queries/adminOps";

const AdminSettings = () => {
  const { user } = useAuth();
  const query = useSiteSettings();
  const save = useSaveSetting();

  const [announcement, setAnnouncement] = useState<AnnouncementSetting>(ANNOUNCEMENT_DEFAULT);
  const [features, setFeatures] = useState<FeaturesSetting>(FEATURES_DEFAULT);

  // Hydrate local editor state whenever the settings map (re)loads.
  useEffect(() => {
    if (!query.data) return;
    setAnnouncement(readAnnouncement(query.data.announcement));
    setFeatures(readFeatures(query.data.features));
  }, [query.data]);

  const saveAnnouncement = () =>
    save.mutate({
      key: "announcement",
      value: announcement as unknown as Json,
      updatedBy: user?.id,
    });

  const saveFeatures = () =>
    save.mutate({
      key: "features",
      value: features as unknown as Json,
      updatedBy: user?.id,
    });

  return (
    <>
      <SEO title="Settings" noindex />
      <PageHeader title="Settings" subtitle="Control the announcement banner and feature flags." />

      {query.isLoading ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
        </div>
      ) : query.isError ? (
        <div className="mt-6">
          <ErrorState onRetry={() => query.refetch()} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Announcement banner */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-ink-strong">
              Announcement banner
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A site-wide banner shown to all visitors when enabled.
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="ann-enabled">Enabled</Label>
                <Switch
                  id="ann-enabled"
                  checked={announcement.enabled}
                  onCheckedChange={(v) => setAnnouncement((a) => ({ ...a, enabled: v }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-message">Message</Label>
                <Input
                  id="ann-message"
                  value={announcement.message}
                  onChange={(e) => setAnnouncement((a) => ({ ...a, message: e.target.value }))}
                  placeholder="We just launched something new…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-link">Link (optional)</Label>
                <Input
                  id="ann-link"
                  value={announcement.link}
                  onChange={(e) => setAnnouncement((a) => ({ ...a, link: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={saveAnnouncement} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save banner"}
              </Button>
            </div>
          </section>

          {/* Feature flags */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-ink-strong">Feature flags</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Toggle whole areas of the public site on or off.
            </p>

            <div className="mt-5 space-y-3">
              {(
                [
                  { key: "resources", label: "Resources library" },
                  { key: "blog", label: "Blog" },
                  { key: "funding", label: "Funding" },
                ] as const
              ).map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <Label htmlFor={`feat-${key}`}>{label}</Label>
                  <Switch
                    id={`feat-${key}`}
                    checked={features[key]}
                    onCheckedChange={(v) => setFeatures((f) => ({ ...f, [key]: v }))}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={saveFeatures} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save flags"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default AdminSettings;
