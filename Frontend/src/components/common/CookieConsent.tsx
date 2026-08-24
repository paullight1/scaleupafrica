import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import {
  OPEN_COOKIE_SETTINGS_EVENT,
  readConsent,
  writeConsent,
} from "@shared/lib/consent";
import { Button } from "@shared/components/ui/button";
import { Switch } from "@shared/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";

export function CookieConsent() {
  const [initialConsent] = useState(readConsent);
  const [bannerOpen, setBannerOpen] = useState(initialConsent === null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(initialConsent?.analytics ?? false);

  useEffect(() => {
    const openSettings = () => {
      setAnalytics(readConsent()?.analytics ?? false);
      setSettingsOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
  }, []);

  const save = (analyticsEnabled: boolean) => {
    writeConsent({ analytics: analyticsEnabled });
    setAnalytics(analyticsEnabled);
    setBannerOpen(false);
    setSettingsOpen(false);
  };

  return (
    <>
      {bannerOpen ? (
        <section
          role="region"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-navy-dark px-4 py-5 text-white shadow-[0_-18px_50px_rgba(8,18,37,0.28)] sm:px-6 lg:px-8"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-3xl items-start gap-3">
              <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" aria-hidden="true" />
              <p className="text-sm leading-6 text-white/80">
                Cresciva uses essential storage for secure sign-in and site operation. With your
                permission, optional analytics help us understand and improve the experience. Read
                our <Link to="/privacy" className="font-semibold text-white underline underline-offset-4">Privacy Policy</Link>.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettingsOpen(true)}
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                Cookie settings
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => save(false)}
                className="border-white bg-white text-navy hover:bg-white/90 hover:text-navy"
              >
                Reject optional
              </Button>
              <Button type="button" onClick={() => save(true)}>
                Accept all
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cookie settings</DialogTitle>
            <DialogDescription>
              Choose whether Cresciva may use optional analytics. Essential storage cannot be
              disabled because it supports authentication, security and your saved preference.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div>
                <p className="font-semibold text-ink-strong">Essential storage</p>
                <p className="mt-1 text-sm text-muted-foreground">Required for sign-in and core site operation.</p>
              </div>
              <Switch aria-label="Essential storage" checked disabled />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div>
                <p className="font-semibold text-ink-strong">Analytics</p>
                <p className="mt-1 text-sm text-muted-foreground">Helps us measure usage and improve Cresciva.</p>
              </div>
              <Switch aria-label="Analytics" checked={analytics} onCheckedChange={setAnalytics} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => save(false)}>Reject optional</Button>
            <Button type="button" onClick={() => save(analytics)}>Save preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CookieConsent;
