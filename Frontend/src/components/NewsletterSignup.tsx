import { useRef, useState } from "react";
import { subscribeToNewsletter } from "@/lib/email";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { toast } from "sonner";
import { Mail, Check } from "lucide-react";
import { trackEvent } from "@shared/lib/analytics";

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
  const honeypot = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    // The edge function records the subscriber AND sends the welcome email; a
    // repeat signup is a no-op there, so re-submitting never double-mails anyone.
    const result = await subscribeToNewsletter(value, source, honeypot.current?.value ?? "");
    setBusy(false);

    if (!result.ok) {
      toast.error(
        result.error.code === "RATE_LIMITED"
          ? "Too many attempts just now. Please try again in a little while."
          : "Could not subscribe. Please try again.",
      );
      return;
    }

    setDone(true);
    setEmail("");
    void trackEvent("newsletter_signup", { metadata: { source } });
    toast.success("You're subscribed. Check your inbox.");
  };

  if (done) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Check className="h-4 w-4 text-primary-dark" />
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
      {/* Honeypot — hidden from humans and assistive tech; bots fill it and get dropped. */}
      <input
        ref={honeypot}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-px w-px opacity-0"
      />
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
      <Button type="submit" variant="default" size="lg" disabled={busy}>
        {busy ? "Subscribing..." : "Subscribe"}
      </Button>
    </form>
  );
};

export default NewsletterSignup;
