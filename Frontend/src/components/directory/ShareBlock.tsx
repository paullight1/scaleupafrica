import { useState } from "react";
import { Button } from "@shared/components/ui/button";
import { toast } from "sonner";
import { Copy, Check, Share2, MessageCircle } from "lucide-react";

/**
 * "Share this profile" row — the growth loop. Every member becomes a distribution channel.
 * WhatsApp (target audience is Android/WhatsApp-first), X intent, copy-link, and the native
 * share sheet when available (feature-detected).
 */
export function ShareBlock({
  url,
  title,
  summary,
}: {
  url: string;
  title: string;
  summary?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const shareText = summary ? `${title} — ${summary}` : title;
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`;
  const xHref = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: shareText, url });
    } catch {
      /* user dismissed the share sheet — no-op */
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <h2 className="mb-3 font-display text-base font-semibold text-ink-strong">
        Share this profile
      </h2>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="min-h-[44px]">
          <a href={waHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px]">
          <a href={xHref} target="_blank" rel="noopener noreferrer">
            <span aria-hidden className="font-semibold">
              𝕏
            </span>
            Share
          </a>
        </Button>
        <Button variant="outline" className="min-h-[44px]" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        {canNativeShare && (
          <Button variant="outline" className="min-h-[44px]" onClick={nativeShare}>
            <Share2 className="h-4 w-4" /> More
          </Button>
        )}
      </div>
    </div>
  );
}

export default ShareBlock;
