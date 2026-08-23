import { useState, type KeyboardEvent } from "react";
import { Input } from "@shared/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@shared/lib/utils";

/**
 * Reusable chip/tag input. Defaults preserve the legacy keyword behavior:
 * lowercase values, max 10, token length 2..30.
 */
export function KeywordInput({
  value,
  onChange,
  id = "keywords",
  maxItems = 10,
  minLength = 2,
  maxLength = 30,
  lowercase = true,
  placeholder = "shea butter, export, Lagos",
  helpText,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  lowercase?: boolean;
  placeholder?: string;
  helpText?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    const token = lowercase ? trimmed.toLowerCase() : trimmed;
    if (!token || token.length < minLength || token.length > maxLength) return;
    const duplicate = value.some((existing) =>
      lowercase ? existing.toLowerCase() === token.toLowerCase() : existing === token,
    );
    if (duplicate) {
      setDraft("");
      return;
    }
    if (value.length >= maxItems) return;
    onChange([...value, token]);
    setDraft("");
  };

  const remove = (token: string) => onChange(value.filter((item) => item !== token));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      event.preventDefault();
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
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(draft)}
          disabled={value.length >= maxItems}
          placeholder={value.length ? "" : placeholder}
          className="h-9 min-w-[8rem] flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {helpText ?? "Words buyers might search — e.g. shea butter, export, Lagos. Press Enter or comma to add."}
        {value.length >= maxItems && ` You've reached the ${maxItems}-item limit.`}
      </p>
    </div>
  );
}

export default KeywordInput;
