import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Check } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type Props = {
  source?: string;
  className?: string;
  /** "inline" (footer/compact) or "card" (standalone block) */
  variant?: "inline" | "card";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NewsletterSignup = ({ source = "site", className = "", variant = "inline" }: Props) => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .upsert({ email: value, source }, { onConflict: "email", ignoreDuplicates: true });
      if (error) throw error;
      setDone(true);
      setEmail("");
      void trackEvent("newsletter_signup", { metadata: { source } });
      toast.success("You're subscribed. Welcome aboard!");
    } catch {
      toast.error("Could not subscribe. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Check className="h-4 w-4 text-gold" />
        <span>Thanks — check your inbox for what's next.</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`flex w-full flex-col gap-3 sm:flex-row ${
        variant === "card" ? "max-w-md" : ""
      } ${className}`}
    >
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="h-11 pl-9"
          aria-label="Email address"
          required
        />
      </div>
      <Button type="submit" variant="gold" size="lg" disabled={busy}>
        {busy ? "Subscribing..." : "Subscribe"}
      </Button>
    </form>
  );
};

export default NewsletterSignup;
