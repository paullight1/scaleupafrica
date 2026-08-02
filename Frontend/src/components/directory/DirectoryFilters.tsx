import { cn } from "@shared/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import type { FacetValue } from "@/hooks/queries/directory";

const TOP_CHIPS = 8;

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-secondary text-secondary-foreground hover:border-primary/40",
      )}
    >
      {label}
      {typeof count === "number" && (
        <span className={cn("ml-1.5 text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {count}
        </span>
      )}
    </button>
  );
}

function FacetRow({
  legend,
  values,
  selected,
  onSelect,
}: {
  legend: string;
  values: FacetValue[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  if (values.length === 0) return null;
  const top = values.slice(0, TOP_CHIPS);
  const overflow = values.slice(TOP_CHIPS);
  // Ensure the selected value is always visible as a chip even if it lives in the overflow.
  const showSelectedChip = selected && !top.some((v) => v.value === selected);

  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{legend}</legend>
      <Chip label={`All ${legend.toLowerCase()}`} active={!selected} onClick={() => onSelect(null)} />
      {top.map((v) => (
        <Chip
          key={v.value}
          label={v.value}
          count={v.count}
          active={selected === v.value}
          onClick={() => onSelect(selected === v.value ? null : v.value)}
        />
      ))}
      {showSelectedChip && (
        <Chip label={selected as string} active onClick={() => onSelect(null)} />
      )}
      {overflow.length > 0 && (
        <Select
          value={selected && overflow.some((v) => v.value === selected) ? selected : ""}
          onValueChange={(val) => onSelect(val || null)}
        >
          <SelectTrigger
            className="h-11 min-h-[44px] w-auto rounded-full border-border bg-secondary px-4 text-sm"
            aria-label={`More ${legend.toLowerCase()}`}
          >
            <SelectValue placeholder={`More ${legend.toLowerCase()}…`} />
          </SelectTrigger>
          <SelectContent>
            {overflow.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.value} ({v.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </fieldset>
  );
}

export function DirectoryFilters({
  countries,
  sectors,
  selectedCountry,
  selectedSector,
  onCountry,
  onSector,
}: {
  countries: FacetValue[];
  sectors: FacetValue[];
  selectedCountry: string | null;
  selectedSector: string | null;
  onCountry: (value: string | null) => void;
  onSector: (value: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <FacetRow legend="Countries" values={countries} selected={selectedCountry} onSelect={onCountry} />
      <FacetRow legend="Sectors" values={sectors} selected={selectedSector} onSelect={onSector} />
    </div>
  );
}

export default DirectoryFilters;
