"use client";

import { useEffect, useState } from "react";
import type { CountryPublic, StatePublic } from "@vendors/shared-types";
import { MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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
  /** Lock country to Nigeria — only ask for state/region. */
  nigeriaOnly?: boolean;
};

/**
 * Country + state selectors. With `nigeriaOnly`, country is fixed to NG
 * and only the state/region field is shown.
 */
export function CountryStateSelect({
  countryCode = "",
  stateCode = "",
  onChange,
  required,
  idPrefix = "geo",
  className,
  nigeriaOnly = false,
}: Props) {
  const lockedCountry = nigeriaOnly ? "NG" : countryCode;
  const [countries, setCountries] = useState<CountryPublic[]>([]);
  const [states, setStates] = useState<StatePublic[]>([]);
  const [country, setCountry] = useState(lockedCountry || countryCode);
  const [state, setState] = useState(stateCode);

  useEffect(() => {
    if (nigeriaOnly) {
      setCountry("NG");
      return;
    }
    setCountry(countryCode);
  }, [countryCode, nigeriaOnly]);

  useEffect(() => {
    setState(stateCode);
  }, [stateCode]);

  useEffect(() => {
    if (nigeriaOnly) return;
    apiFetch<{ countries: CountryPublic[] }>("/api/geo/countries")
      .then((r) => setCountries(r.countries))
      .catch(() => setCountries([]));
  }, [nigeriaOnly]);

  useEffect(() => {
    const code = nigeriaOnly ? "NG" : country;
    if (!code) {
      setStates([]);
      return;
    }
    apiFetch<{ states: StatePublic[] }>(
      `/api/geo/countries/${encodeURIComponent(code)}/states`
    )
      .then((r) => setStates(r.states))
      .catch(() => setStates([]));
  }, [country, nigeriaOnly]);

  useEffect(() => {
    if (!nigeriaOnly) return;
    setCountry("NG");
  }, [nigeriaOnly]);

  function emit(nextCountry: string, nextState: string) {
    const c = nigeriaOnly
      ? { name: "Nigeria" }
      : countries.find((x) => x.iso2 === nextCountry);
    const s = states.find((x) => (x.iso2 || x.name) === nextState);
    const label = [s?.name, c?.name].filter(Boolean).join(", ");
    onChange({
      countryCode: nextCountry,
      stateCode: nextState,
      label,
    });
  }

  if (nigeriaOnly) {
    return (
      <div className={className ?? "grid gap-3"}>
        <Label>
          <span>State / region</span>
          <Select
            id={`${idPrefix}-state`}
            required={required}
            disabled={states.length === 0}
            icon={<MapPin />}
            value={state}
            onChange={(e) => {
              const next = e.target.value;
              setState(next);
              emit("NG", next);
            }}
          >
            <option value="">
              {states.length === 0 ? "Loading states…" : "Select state"}
            </option>
            {states.map((s) => (
              <option key={s.id} value={s.iso2 || s.name}>
                {s.name}
              </option>
            ))}
          </Select>
        </Label>
        <p className="text-xs text-muted-foreground">
          We’re focused on Nigeria for now — country is set automatically.
        </p>
      </div>
    );
  }

  return (
    <div className={className ?? "grid gap-3 sm:grid-cols-2"}>
      <Label>
        <span>Country</span>
        <Select
          id={`${idPrefix}-country`}
          required={required}
          icon={<MapPin />}
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
        </Select>
      </Label>
      <Label>
        <span>State / region</span>
        <Select
          id={`${idPrefix}-state`}
          required={required && states.length > 0}
          disabled={!country || states.length === 0}
          icon={<MapPin />}
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
        </Select>
      </Label>
    </div>
  );
}
