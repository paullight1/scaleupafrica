import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_KEYWORDS = 10;

/**
 * Chip/tag input writing the `keywords TEXT[]` column. Enter or comma commits the current
 * token; ⨯ (or Backspace on an empty field) removes the last. Deduped, lowercased on commit.
 */
export function KeywordInput({
  value,
  onChange,
  id = "keywords",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const token = raw.trim().toLowerCase();
    if (!token) return;
    if (token.length < 2 || token.length > 30) return;
    if (value.includes(token)) {
      setDraft("");
      return;
    }
    if (value.length >= MAX_KEYWORDS) return;
    onChange([...value, token]);
    setDraft("");
  };

  const remove = (token: string) => onChange(value.filter((k) => k !== token));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      e.preventDefault();
      remove(value[value.length - 1]);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex flex-wrap gap-2 rounded-lg border border-input bg-background p-2",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        )}
      >
        {value.map((token) => (
          <span
            key={token}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-secondary px-3 text-sm text-secondary-foreground"
          >
            {token}
            <button
              type="button"
              onClick={() => remove(token)}
              aria-label={`Remove ${token}`}
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-border hover:text-ink-strong"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(draft)}
          disabled={value.length >= MAX_KEYWORDS}
          placeholder={value.length ? "" : "shea butter, export, Lagos"}
          className="h-9 min-w-[8rem] flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Words buyers might search — e.g. shea butter, export, Lagos. Press Enter or comma to add.
        {value.length >= MAX_KEYWORDS && " You've reached the 10-keyword limit."}
      </p>
    </div>
  );
}

export default KeywordInput;
