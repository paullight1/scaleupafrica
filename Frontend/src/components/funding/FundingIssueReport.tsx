import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@shared/components/ui/button";
import { supabase } from "@shared/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as unknown as SupabaseClient;

const CATEGORIES = [
  ["closed", "This opportunity is closed"],
  ["deadline", "The deadline looks wrong"],
  ["eligibility", "The eligibility looks wrong"],
  ["source", "The official source is wrong or broken"],
  ["other", "Something else is wrong"],
] as const;

type Category = typeof CATEGORIES[number][0];

export function FundingIssueReport({ opportunityId }: { opportunityId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("closed");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) return <p className="mt-2 text-xs text-muted-foreground">Thanks — this opportunity is queued for source review.</p>;

  const submit = async () => {
    setSubmitting(true);
    try {
      const { error } = await db.from("funding_opportunity_reports").insert({
        opportunity_id: opportunityId,
        category,
        message: message.trim() || null,
      });
      if (error) {
        if (error.code === "23505") {
          setSubmitted(true);
          return;
        }
        throw error;
      }
      setSubmitted(true);
      toast.success("Thanks — Cresciva will review the source.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't submit that correction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 border-t border-border/70 pt-2">
      {!open ? (
        <button type="button" className="min-h-11 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => setOpen(true)}>
          Report wrong or outdated information
        </button>
      ) : (
        <div className="space-y-3 rounded-lg bg-surface-subtle p-3">
          <label className="block text-xs font-medium text-ink-strong" htmlFor={`funding-report-category-${opportunityId}`}>What's wrong?</label>
          <select id={`funding-report-category-${opportunityId}`} value={category} onChange={(event) => setCategory(event.target.value as Category)} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm">
            {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label className="block text-xs font-medium text-ink-strong" htmlFor={`funding-report-message-${opportunityId}`}>Optional details</label>
          <textarea id={`funding-report-message-${opportunityId}`} value={message} onChange={(event) => setMessage(event.target.value.slice(0, 1000))} rows={3} className="w-full rounded-md border border-border bg-background p-3 text-sm" placeholder="What did you see on the official source?" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={submitting} onClick={submit}>{submitting ? "Sending…" : "Send report"}</Button>
            <Button type="button" size="sm" variant="ghost" disabled={submitting} onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
