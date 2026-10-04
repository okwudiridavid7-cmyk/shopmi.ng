"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import {
  ArrowRight,
  ImageIcon,
  LoaderIcon,
  SearchIcon,
  TrendingUp,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatResult {
  id: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  imageUrl?: string | null;
  href: string;
}

export interface ChatSuggestion {
  id: string;
  label: string;
}

export interface AnimatedAIChatHandle {
  focus: () => void;
}

export interface AnimatedAIChatProps {
  onSubmit: (query: string) => void | Promise<void>;
  onQueryChange?: (query: string) => void;
  results?: ChatResult[];
  resultsLoading?: boolean;
  onResultSelect?: (result: ChatResult) => void;
  /** Shown when the field is focused but empty. */
  suggestions?: ChatSuggestion[];
  suggestionsLabel?: string;
  onSuggestionSelect?: (suggestion: ChatSuggestion) => void;
  placeholders?: string[];
  submitLabel?: string;
  className?: string;
}

const MIN_RESULTS_QUERY = 2;
const BUSY_SAFETY_MS = 6000;

export const AnimatedAIChat = React.forwardRef<
  AnimatedAIChatHandle,
  AnimatedAIChatProps
>(function AnimatedAIChat(
  {
    onSubmit,
    onQueryChange,
    results = [],
    resultsLoading = false,
    onResultSelect,
    suggestions = [],
    suggestionsLabel = "Popular right now",
    onSuggestionSelect,
    placeholders = ["What are you shopping for today?"],
    submitLabel = "Search",
    className,
  },
  ref
) {
  const reduceMotion = useReducedMotion();
  const id = React.useId();
  const listboxId = `${id}-listbox`;

  const [value, setValue] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [busy, setBusy] = React.useState(false);
  const [placeholderIndex, setPlaceholderIndex] = React.useState(0);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const busyTimer = React.useRef<number | undefined>(undefined);

  React.useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  const query = value.trim();
  const showResults =
    focused && !busy && !dismissed && query.length >= MIN_RESULTS_QUERY;
  const showSuggestions =
    focused && !busy && !dismissed && !query && suggestions.length > 0;
  const open = showResults || showSuggestions;
  const rowCount = showResults
    ? results.length + 1
    : showSuggestions
      ? suggestions.length
      : 0;

  React.useEffect(() => {
    onQueryChange?.(query);
  }, [onQueryChange, query]);

  React.useEffect(() => {
    setActive(-1);
  }, [showResults, showSuggestions, results.length]);

  React.useEffect(() => {
    if (value || focused || reduceMotion || placeholders.length < 2) return;
    const timer = window.setInterval(
      () => setPlaceholderIndex((i) => (i + 1) % placeholders.length),
      3200
    );
    return () => window.clearInterval(timer);
  }, [value, focused, reduceMotion, placeholders.length]);

  React.useEffect(() => () => window.clearTimeout(busyTimer.current), []);

  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const springX = useSpring(glowX, { damping: 25, stiffness: 150, mass: 0.5 });
  const springY = useSpring(glowY, { damping: 25, stiffness: 150, mass: 0.5 });

  React.useEffect(() => {
    if (!focused || reduceMotion) return;
    const onMove = (event: PointerEvent) => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      glowX.set(event.clientX - rect.left - 320);
      glowY.set(event.clientY - rect.top - 320);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [focused, reduceMotion, glowX, glowY]);

  const startBusy = () => {
    setBusy(true);
    window.clearTimeout(busyTimer.current);
    busyTimer.current = window.setTimeout(() => setBusy(false), BUSY_SAFETY_MS);
  };

  const submit = async (text = value) => {
    const q = text.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    startBusy();
    try {
      await onSubmit(q);
    } catch {
      window.clearTimeout(busyTimer.current);
      setBusy(false);
    }
  };

  const pickResult = (result: ChatResult) => {
    startBusy();
    onResultSelect?.(result);
  };

  const pickSuggestion = (suggestion: ChatSuggestion) => {
    setValue(suggestion.label);
    startBusy();
    onSuggestionSelect?.(suggestion);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % rowCount);
      return;
    }
    if (open && event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? rowCount - 1 : i - 1));
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setDismissed(true);
      }
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (showSuggestions && active >= 0) {
      const suggestion = suggestions[active];
      if (suggestion) pickSuggestion(suggestion);
      return;
    }
    if (showResults && active >= 0 && active < results.length) {
      const result = results[active];
      if (result) pickResult(result);
      return;
    }
    void submit();
  };

  const optionId = (index: number) => `${id}-opt-${index}`;
  const rowClass = (index: number) =>
    cn(
      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
      active === index ? "bg-muted" : "hover:bg-muted"
    );

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <AnimatePresence>
        {focused && !reduceMotion ? (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-0 h-[40rem] w-[40rem] rounded-full blur-[96px]"
            style={{
              x: springX,
              y: springY,
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--color-accent) 20%, transparent), transparent 70%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        ) : null}
      </AnimatePresence>

      <motion.form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className={cn(
          "relative z-10 flex items-center gap-2 rounded-full border bg-card py-2 pl-5 pr-2 shadow-lg transition-[border-color,box-shadow] duration-200",
          focused || busy
            ? "border-accent shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_14%,transparent)]"
            : "border-border"
        )}
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <SearchIcon
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-muted-foreground"
        />
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            type="search"
            value={value}
            role="combobox"
            aria-label="Search for items"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            enterKeyHint="search"
            autoComplete="off"
            onChange={(e) => {
              setValue(e.target.value);
              setDismissed(false);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true);
              setDismissed(false);
            }}
            onBlur={() => setFocused(false)}
            className="block h-11 w-full bg-transparent text-base text-foreground outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {!value ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center overflow-hidden text-base text-muted-foreground"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={placeholderIndex}
                  className="block truncate"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  {placeholders[placeholderIndex % placeholders.length]}
                </motion.span>
              </AnimatePresence>
            </div>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {value && !busy ? (
            <motion.button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setValue("");
                inputRef.current?.focus();
              }}
              className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <XIcon className="h-4 w-4" />
            </motion.button>
          ) : null}
        </AnimatePresence>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          disabled={busy}
          className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-accent-strong px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-90 disabled:opacity-90"
        >
          {busy ? (
            <LoaderIcon className="h-4 w-4 animate-[spin_1.2s_linear_infinite]" />
          ) : (
            <SearchIcon className="h-4 w-4 sm:hidden" />
          )}
          <span className={cn(busy ? "" : "hidden sm:inline")}>
            {busy ? "Searching…" : submitLabel}
          </span>
        </motion.button>
      </motion.form>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-label={showResults ? "Matching items" : suggestionsLabel}
            className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-card p-2 text-left shadow-xl"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {showSuggestions ? (
              <>
                <p className="flex items-center gap-1.5 px-3 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-accent" aria-hidden />
                  {suggestionsLabel}
                </p>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    id={optionId(index)}
                    type="button"
                    role="option"
                    aria-selected={active === index}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pickSuggestion(suggestion)}
                    className={cn(rowClass(index), "text-sm text-foreground")}
                  >
                    <SearchIcon
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="truncate">{suggestion.label}</span>
                  </button>
                ))}
              </>
            ) : null}

            {showResults ? (
              <>
                {resultsLoading && results.length === 0
                  ? [0, 1].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="h-11 w-11 animate-pulse rounded-lg bg-muted" />
                        <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
                      </div>
                    ))
                  : null}
                {results.map((result, index) => (
                  <a
                    key={result.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={active === index}
                    href={result.href}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)
                        return;
                      e.preventDefault();
                      pickResult(result);
                    }}
                    className={rowClass(index)}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {result.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {result.title}
                      </span>
                      {result.subtitle ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      ) : null}
                    </span>
                    {result.meta ? (
                      <span className="shrink-0 text-sm font-semibold text-foreground">
                        {result.meta}
                      </span>
                    ) : null}
                  </a>
                ))}
                {!resultsLoading && results.length === 0 ? (
                  <p className="px-3 pb-1 pt-2 text-sm text-muted-foreground">
                    No matches
                  </p>
                ) : null}
                <button
                  id={optionId(results.length)}
                  type="button"
                  role="option"
                  aria-selected={active === results.length}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(results.length)}
                  onClick={() => void submit()}
                  className={cn(
                    rowClass(results.length),
                    "mt-1 text-sm font-medium text-accent-strong dark:text-accent-on-dark"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    See everything for “{query}”
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              </>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

export default AnimatedAIChat;
