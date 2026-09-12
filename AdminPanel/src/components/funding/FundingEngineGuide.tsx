import { useEffect, useState } from "react";
import { Check, Database, Radar, Tags } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";

const STEPS = [
  {
    icon: Database,
    eyebrow: "Connected service",
    title: "Cresciva talks to the Edutu Engine API",
    body: "This page is a control panel. Your command travels through Cresciva's protected Supabase Edge Function to the Edutu API on Render, where the scraper and AI enrichment run. The private API key never enters your browser.",
  },
  {
    icon: Radar,
    eyebrow: "Grant discovery",
    title: "Choose where Edutu should search",
    body: "Select one enabled source or all sources, then set the page limit. Every Cresciva run is locked to grants, even when an Edutu source also publishes scholarships, jobs, or programmes.",
  },
  {
    icon: Tags,
    eyebrow: "Filtered return",
    title: "Only grant-tagged results return",
    body: "Edutu classifies matching records as grants and adds the exact “grants” tag. Cresciva's Supabase bridge only returns those grant runs and grant opportunities for review.",
  },
] as const;

export function FundingEngineGuide({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-xl">
        <div className="bg-navy px-6 pb-7 pt-6 text-white">
          <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
            Edutu Engine API · Grants only
          </Badge>
          <DialogHeader className="mt-5 text-left">
            <DialogTitle className="font-display text-2xl text-white">
              How Cresciva grant discovery works
            </DialogTitle>
            <DialogDescription className="text-white/70">
              A guided look at the service behind this workspace.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          <ol className="-mt-3 grid grid-cols-3 gap-2" aria-label="Guide progress">
            {STEPS.map((item, index) => (
              <li
                key={item.title}
                className={`h-1.5 rounded-full ${index <= step ? "bg-primary" : "bg-border"}`}
              >
                <span className="sr-only">
                  Step {index + 1}: {item.title}
                </span>
              </li>
            ))}
          </ol>

          <div className="py-8">
            <span className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
              <Icon className="h-6 w-6" />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Step {step + 1} of {STEPS.length} · {current.eyebrow}
            </p>
            <h3 className="mt-2 font-display text-xl font-semibold text-ink-strong">
              {current.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {current.body}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-5">
            <Button
              variant="ghost"
              onClick={() => (step === 0 ? onOpenChange(false) : setStep((value) => value - 1))}
            >
              {step === 0 ? "Skip guide" : "Back"}
            </Button>
            <Button
              onClick={() =>
                step === STEPS.length - 1
                  ? onOpenChange(false)
                  : setStep((value) => value + 1)
              }
            >
              {step === STEPS.length - 1 ? (
                <>
                  <Check className="mr-2 h-4 w-4" />Got it
                </>
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
