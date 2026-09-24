"use client";

import { useEffect, useState } from "react";
import type { CountryPublic, StatePublic } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { Label } from "@/components/ui/input";

export type LocationValue = {
  countryCode: string;
  stateCode: string;
  /** Human-readable summary for legacy `location` string fields. */
  label: string;
};

type Props = {
  countryCode?: string;
  stateCode?: string;
  onChange: (value: LocationValue) => void;
  required?: boolean;
  idPrefix?: string;
  className?: string;
};

export function CountryStateSelect({
  countryCode = "",
  stateCode = "",
  onChange,
  required,
  idPrefix = "geo",
  className,
}: Props) {
  const [countries, setCountries] = useState<CountryPublic[]>([]);
  const [states, setStates] = useState<StatePublic[]>([]);
  const [country, setCountry] = useState(countryCode);
  const [state, setState] = useState(stateCode);

  useEffect(() => {
    setCountry(countryCode);
  }, [countryCode]);

  useEffect(() => {
    setState(stateCode);
  }, [stateCode]);

  useEffect(() => {
    apiFetch<{ countries: CountryPublic[] }>("/api/geo/countries")
      .then((r) => setCountries(r.countries))
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (!country) {
      setStates([]);
      return;
    }
    apiFetch<{ states: StatePublic[] }>(
      `/api/geo/countries/${encodeURIComponent(country)}/states`
    )
      .then((r) => setStates(r.states))
      .catch(() => setStates([]));
  }, [country]);

  function emit(nextCountry: string, nextState: string) {
    const c = countries.find((x) => x.iso2 === nextCountry);
    const s = states.find((x) => (x.iso2 || x.name) === nextState);
    const label = [s?.name, c?.name].filter(Boolean).join(", ");
    onChange({
      countryCode: nextCountry,
      stateCode: nextState,
      label,
    });
  }

  return (
    <div className={className ?? "grid gap-token-3 sm:grid-cols-2"}>
      <Label>
        <span>Country</span>
        <select
          id={`${idPrefix}-country`}
          required={required}
          className="w-full rounded-md border border-border bg-card px-token-3 py-token-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={country}
          onChange={(e) => {
            const next = e.target.value;
            setCountry(next);
            setState("");
            emit(next, "");
          }}
        >
          <option value="">Select country</option>
          {countries.map((c) => (
            <option key={c.iso2} value={c.iso2}>
              {c.name}
            </option>
          ))}
        </select>
      </Label>
      <Label>
        <span>State / region</span>
        <select
          id={`${idPrefix}-state`}
          required={required && states.length > 0}
          disabled={!country || states.length === 0}
          className="w-full rounded-md border border-border bg-card px-token-3 py-token-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          value={state}
          onChange={(e) => {
            const next = e.target.value;
            setState(next);
            emit(country, next);
          }}
        >
          <option value="">
            {!country
              ? "Select country first"
              : states.length === 0
                ? "No states listed"
                : "Select state"}
          </option>
          {states.map((s) => (
            <option key={s.id} value={s.iso2 || s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </Label>
    </div>
  );
}
