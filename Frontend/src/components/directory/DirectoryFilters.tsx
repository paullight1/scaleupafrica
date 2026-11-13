import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import type { FacetValue } from "@/hooks/queries/directory";

const ALL = "__all__";

export function DirectoryFilters({
  countries,
  sectors,
  selectedCountry,
  selectedSector,
  onCountry,
  onSector,
  onClear,
}: {
  countries: FacetValue[];
  sectors: FacetValue[];
  selectedCountry: string | null;
  selectedSector: string | null;
  onCountry: (value: string | null) => void;
  onSector: (value: string | null) => void;
  onClear?: () => void;
}) {
  const activeCount = Number(Boolean(selectedCountry)) + Number(Boolean(selectedSector));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 gap-1.5 rounded-md px-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label={`Filter directory${activeCount ? `, ${activeCount} active` : ""}`}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Filter directory</p>
            <p className="text-xs text-muted-foreground">Narrow results by location or sector.</p>
          </div>
          {activeCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mr-2 -mt-2 h-8 gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => onClear?.()}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="directory-country-filter" className="text-sm font-medium text-foreground">
            Country
          </label>
          <Select
            value={selectedCountry ?? ALL}
            onValueChange={(value) => onCountry(value === ALL ? null : value)}
          >
            <SelectTrigger id="directory-country-filter" className="h-10">
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All countries</SelectItem>
              {countries.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.value} ({country.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="directory-sector-filter" className="text-sm font-medium text-foreground">
            Sector
          </label>
          <Select
            value={selectedSector ?? ALL}
            onValueChange={(value) => onSector(value === ALL ? null : value)}
          >
            <SelectTrigger id="directory-sector-filter" className="h-10">
              <SelectValue placeholder="All sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sectors</SelectItem>
              {sectors.map((sector) => (
                <SelectItem key={sector.value} value={sector.value}>
                  {sector.value} ({sector.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DirectoryFilters;
