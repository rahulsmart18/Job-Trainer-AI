"use client";

import { useMemo, useState } from "react";
import { OTHER_VALUE, otherOptionLabel } from "@/types/onboarding";

type Props = {
  label: string;
  hint?: string;
  value: string;
  otherValue: string;
  onChange: (value: string) => void;
  onOtherChange: (value: string) => void;
  options: readonly string[];
  otherFieldName: string;
  placeholder?: string;
};

export function SearchableSelect({
  label,
  hint,
  value,
  otherValue,
  onChange,
  onOtherChange,
  options,
  otherFieldName,
  placeholder = "Search or select…",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const presetOptions = useMemo(
    () => options.filter((o) => o !== OTHER_VALUE),
    [options],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return presetOptions;
    return presetOptions.filter((o) => o.toLowerCase().includes(q));
  }, [presetOptions, query]);

  const displayValue =
    value === OTHER_VALUE
      ? otherValue || otherOptionLabel(otherFieldName)
      : value;

  const pick = (option: string) => {
    onChange(option);
    if (option !== OTHER_VALUE) {
      onOtherChange("");
      setQuery(option);
    } else {
      setQuery("");
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="mb-1.5">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>

      <input
        className="field-input"
        placeholder={placeholder}
        value={open ? query : displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value && value !== OTHER_VALUE && e.target.value !== value) {
            onChange("");
          }
        }}
        onFocus={() => {
          setOpen(true);
          if (value && value !== OTHER_VALUE) setQuery(value);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
      />

      {open && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-trust/20 bg-surface-elevated shadow-xl">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted">No matches — pick Other below.</li>
          )}
          {filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                className={`w-full px-3 py-2.5 text-left text-sm transition hover:bg-trust/10 ${
                  value === option ? "bg-trust/15 font-semibold text-trust" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(option)}
              >
                {option}
              </button>
            </li>
          ))}
          <li className="border-t border-trust/10">
            <button
              type="button"
              className={`w-full px-3 py-2.5 text-left text-sm font-medium transition hover:bg-premium/10 ${
                value === OTHER_VALUE ? "bg-premium/15 text-premium" : "text-premium"
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(OTHER_VALUE)}
            >
              {otherOptionLabel(otherFieldName)}
            </button>
          </li>
        </ul>
      )}

      {value === OTHER_VALUE && (
        <input
          className="field-input mt-2"
          placeholder={`Type your ${otherFieldName}…`}
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          autoFocus
        />
      )}
    </div>
  );
}
