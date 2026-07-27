import { useRef } from "react";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicProfilePath, publicProfileUrl } from "@/lib/dashboard/profileUrl";
import type { Profile } from "@/lib/dashboard/types";

/**
 * Pillar B growth loop (IMPROVEMENTS §4): copyable public link + WhatsApp share
 * + native share. The URL is built only via publicProfilePath (plan 04 seam).
 */
export function ShareLinkCard({ profile }: { profile: Profile }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const url = publicProfileUrl(profile);
  const message = `Check out ${profile.business_name} on Cresciva: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      inputRef.current?.select();
      toast.error("Couldn't copy automatically — the link is selected, copy it manually.");
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: profile.business_name, text: message, url });
      } catch {
        /* user cancelled — no-op */
      }
    } else {
      copy();
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-display text-lg font-semibold text-ink-strong">Share your profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The fastest way to get seen is to send your link to your network.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          ref={inputRef}
          readOnly
          value={url}
          aria-label="Your public profile link"
          onFocus={(e) => e.currentTarget.select()}
          className="font-mono text-sm"
        />
        <Button type="button" variant="outline" onClick={copy} className="shrink-0">
          <Copy className="h-4 w-4" /> Copy link
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <Button asChild>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Share2 className="h-4 w-4" /> Share on WhatsApp
          </a>
        </Button>
        <Button type="button" variant="ghost" onClick={nativeShare}>
          <Share2 className="h-4 w-4" /> More
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Anyone with this link can view your public profile
        <span className="sr-only"> at {publicProfilePath(profile)}</span>.
      </p>
    </div>
  );
}

export default ShareLinkCard;
