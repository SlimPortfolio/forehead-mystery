"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MAX_RESULTS = 50;

type CityAutocompleteProps = {
  /** Selected region key (US state abbreviation or country name). Empty until picked. */
  regionKey: string;
  /** Loads the city list for a region key. Must be a stable reference. */
  getCities: (regionKey: string) => Promise<string[]>;
  value: string;
  onChange: (city: string) => void;
  /** Fired whenever the entered city's validity (is it a real city in the region) changes. */
  onValidityChange?: (isValid: boolean) => void;
  className?: string;
  placeholder?: string;
  /** Placeholder shown while no region is selected. */
  disabledHint?: string;
};

export default function CityAutocomplete({
  regionKey,
  getCities,
  value,
  onChange,
  onValidityChange,
  className,
  placeholder,
  disabledHint = "Select a region first",
}: CityAutocompleteProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load the city list for the selected region (lazy-loads the dataset once).
  // The getter resolves to [] for an empty region, so no state-clearing side
  // effects are needed here.
  useEffect(() => {
    let active = true;
    getCities(regionKey).then((list) => {
      if (active) setCities(list);
    });
    return () => {
      active = false;
    };
  }, [regionKey, getCities]);

  const citySet = useMemo(
    () => new Set(cities.map((c) => c.toLowerCase())),
    [cities],
  );

  const isValid =
    value.trim() !== "" && citySet.has(value.trim().toLowerCase());

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];
    const starts: string[] = [];
    const contains: string[] = [];
    for (const city of cities) {
      const lower = city.toLowerCase();
      if (lower.startsWith(query)) starts.push(city);
      else if (lower.includes(query)) contains.push(city);
      if (starts.length >= MAX_RESULTS) break;
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [cities, value]);

  // Close the menu when clicking outside.
  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const disabled = regionKey === "";
  const showMenu = open && !disabled && matches.length > 0;

  const commit = (city: string) => {
    onChange(city);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMenu) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      commit(matches[highlight] ?? matches[0]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={
          className ??
          "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        }
        placeholder={disabled ? disabledHint : placeholder ?? "Start typing a city"}
        autoComplete="off"
        role="combobox"
        aria-controls="city-autocomplete-list"
        aria-expanded={showMenu}
        aria-autocomplete="list"
      />
      {!disabled && value.trim() !== "" && (
        <span
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm ${
            isValid ? "text-emerald-600" : "text-slate-300"
          }`}
          aria-hidden
        >
          {isValid ? "✓" : ""}
        </span>
      )}
      {showMenu && (
        <ul
          id="city-autocomplete-list"
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {matches.map((city, index) => (
            <li key={city}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(city)}
                onMouseEnter={() => setHighlight(index)}
                className={`w-full rounded-lg px-3 py-1.5 text-left text-sm ${
                  index === highlight ? "bg-slate-100" : ""
                }`}
              >
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
