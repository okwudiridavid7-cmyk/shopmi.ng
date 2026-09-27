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
  Command,
  CornerDownLeft,
  ImageIcon,
  LoaderIcon,
  SearchIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatCommand {
  icon: React.ReactNode;
  label: string;
  description: string;
  /** Slash trigger, e.g. `/search`. */
  prefix: string;
  /** When true, picking the command waits for the user to type a query after it. */
  takesQuery?: boolean;
  /** Status pill text while the command runs. */
  status?: string | ((query: string) => string);
}

export interface ChatResult {
  id: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  imageUrl?: string | null;
  href: string;
}

export interface AnimatedAIChatHandle {
  /** Types `text` into the field, then submits it — used to replay CTA clicks as commands. */
  run: (text: string) => void;
  focus: () => void;
}

export interface AnimatedAIChatProps {
  commands: ChatCommand[];
  onSubmit: (query: string, command: ChatCommand | null) => void | Promise<void>;
  /** Fires with the plain search text (slash commands stripped) as the user types. */
  onQueryChange?: (query: string) => void;
  results?: ChatResult[];
  resultsLoading?: boolean;
  onResultSelect?: (result: ChatResult) => void;
  placeholders?: string[];
  searchStatus?: (query: string) => string;
  submitLabel?: string;
  className?: string;
}

const MIN_RESULTS_QUERY = 2;
const TYPE_INTERVAL_MS = 38;
const STATUS_SAFETY_MS = 6000;

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: {
  minHeight: number;
  maxHeight?: number;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = `${minHeight}px`;
      if (reset) return;
      const next = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );
      textarea.style.height = `${next}px`;
    },
    [minHeight, maxHeight]
  );

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) textarea.style.height = `${minHeight}px`;
  }, [minHeight]);

  React.useEffect(() => {
    const onResize = () => adjustHeight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

function parseInput(text: string, commands: ChatCommand[]) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return { command: null, query: trimmed };
  const [head = "", ...rest] = trimmed.split(/\s+/);
  const command =
    commands.find((c) => c.prefix.toLowerCase() === head.toLowerCase()) ?? null;
  if (command) return { command, query: rest.join(" ").trim() };
  return { command: null, query: trimmed.replace(/^\/+/, "").trim() };
}

const glass =
  "bg-[color-mix(in_oklab,var(--color-card)_78%,transparent)] backdrop-blur-xl";

export const AnimatedAIChat = React.forwardRef<
  AnimatedAIChatHandle,
  AnimatedAIChatProps
>(function AnimatedAIChat(
  {
    commands,
    onSubmit,
    onQueryChange,
    results = [],
    resultsLoading = false,
    onResultSelect,
    placeholders = ["Search the marketplace…"],
    searchStatus = (q) => `Searching the marketplace for “${q}”`,
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
  const [paletteForced, setPaletteForced] = React.useState(false);
  const [resultsDismissed, setResultsDismissed] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [status, setStatus] = React.useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = React.useState(0);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const paletteRef = React.useRef<HTMLDivElement>(null);
  const commandButtonRef = React.useRef<HTMLButtonElement>(null);
  const typingTimer = React.useRef<number | undefined>(undefined);
  const statusTimer = React.useRef<number | undefined>(undefined);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 140,
  });

  const busy = status !== null;
  const trimmed = value.trim();
  const slashTyping = value.startsWith("/") && !value.includes(" ");

  const paletteItems = React.useMemo(() => {
    if (slashTyping) {
      const needle = value.toLowerCase();
      return commands.filter((c) => c.prefix.toLowerCase().startsWith(needle));
    }
    return paletteForced ? commands : [];
  }, [commands, paletteForced, slashTyping, value]);
  const paletteOpen = !busy && paletteItems.length > 0;

  const parsed = parseInput(value, commands);
  const searchQuery =
    !slashTyping && (!parsed.command || parsed.command.takesQuery)
      ? parsed.query
      : "";
  const resultsOpen =
    focused &&
    !busy &&
    !paletteOpen &&
    !resultsDismissed &&
    searchQuery.length >= MIN_RESULTS_QUERY;
  const resultRows = results.length + 1;

  React.useEffect(() => {
    onQueryChange?.(searchQuery);
  }, [onQueryChange, searchQuery]);

  React.useEffect(() => {
    setActive(paletteOpen ? 0 : -1);
  }, [paletteOpen, paletteItems.length, results.length]);

  React.useEffect(() => {
    if (value || focused || reduceMotion || placeholders.length < 2) return;
    const timer = window.setInterval(
      () => setPlaceholderIndex((i) => (i + 1) % placeholders.length),
      3200
    );
    return () => window.clearInterval(timer);
  }, [value, focused, reduceMotion, placeholders.length]);

  React.useEffect(() => {
    if (!paletteForced) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        paletteRef.current?.contains(target) ||
        commandButtonRef.current?.contains(target)
      )
        return;
      setPaletteForced(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [paletteForced]);

  React.useEffect(
    () => () => {
      window.clearInterval(typingTimer.current);
      window.clearTimeout(statusTimer.current);
    },
    []
  );

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

  const submit = React.useCallback(
    async (text: string) => {
      const { command, query } = parseInput(text, commands);
      if (!command && !query) return;
      if (command?.takesQuery && !query) {
        setValue(`${command.prefix} `);
        textareaRef.current?.focus();
        return;
      }
      const label = command
        ? typeof command.status === "function"
          ? command.status(query)
          : command.status ?? (query ? searchStatus(query) : command.label)
        : searchStatus(query);
      setPaletteForced(false);
      setStatus(label);
      window.clearTimeout(statusTimer.current);
      statusTimer.current = window.setTimeout(
        () => setStatus(null),
        STATUS_SAFETY_MS
      );
      try {
        await onSubmit(query, command);
      } catch {
        window.clearTimeout(statusTimer.current);
        setStatus(null);
      }
    },
    [commands, onSubmit, searchStatus, textareaRef]
  );

  const submitRef = React.useRef(submit);
  submitRef.current = submit;

  React.useImperativeHandle(
    ref,
    () => ({
      focus: () => textareaRef.current?.focus(),
      run: (text: string) => {
        window.clearInterval(typingTimer.current);
        if (reduceMotion) {
          setValue(text);
          void submitRef.current(text);
          return;
        }
        let i = 0;
        setValue("");
        typingTimer.current = window.setInterval(() => {
          i += 1;
          setValue(text.slice(0, i));
          if (i >= text.length) {
            window.clearInterval(typingTimer.current);
            window.setTimeout(() => void submitRef.current(text), 220);
          }
        }, TYPE_INTERVAL_MS);
      },
    }),
    [reduceMotion, textareaRef]
  );

  const pickCommand = (command: ChatCommand) => {
    setPaletteForced(false);
    if (command.takesQuery) {
      setValue(`${command.prefix} `);
      requestAnimationFrame(() => textareaRef.current?.focus());
      return;
    }
    setValue(command.prefix);
    void submit(command.prefix);
  };

  const pickResult = (result: ChatResult) => {
    setStatus(`Opening ${result.title}`);
    onResultSelect?.(result);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (paletteOpen) {
      const n = paletteItems.length;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => (i + 1) % n);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => (i <= 0 ? n - 1 : i - 1));
      } else if (event.key === "Tab" || event.key === "Enter") {
        event.preventDefault();
        const command = paletteItems[Math.max(0, active)];
        if (command) pickCommand(command);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setPaletteForced(false);
        if (slashTyping) setValue("");
      }
      return;
    }

    if (resultsOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => (i + 1) % resultRows);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => (i <= 0 ? resultRows - 1 : i - 1));
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setResultsDismissed(true);
        return;
      }
      if (event.key === "Enter" && active >= 0 && active < results.length) {
        event.preventDefault();
        const result = results[active];
        if (result) pickResult(result);
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (trimmed) void submit(value);
    }
  };

  const activeDescendant =
    active >= 0 && (paletteOpen || resultsOpen)
      ? `${id}-opt-${active}`
      : undefined;

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
                "radial-gradient(circle, color-mix(in oklab, var(--color-accent) 22%, transparent), transparent 70%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        ) : null}
      </AnimatePresence>

      <motion.div
        className={cn(
          "relative z-10 rounded-2xl border shadow-xl transition-[border-color,box-shadow] duration-200",
          glass,
          focused || busy
            ? "border-accent shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_14%,transparent)]"
            : "border-border"
        )}
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: busy ? 0.985 : 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence>
          {paletteOpen ? (
            <motion.div
              ref={paletteRef}
              id={listboxId}
              role="listbox"
              aria-label="Commands"
              className="absolute bottom-full left-3 right-3 z-50 mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
            >
              <div className="py-1">
                {paletteItems.map((command, index) => (
                  <button
                    key={command.prefix}
                    id={`${id}-opt-${index}`}
                    type="button"
                    role="option"
                    aria-selected={active === index}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pickCommand(command)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                      active === index
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)] text-accent [&_svg]:h-4 [&_svg]:w-4">
                      {command.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">
                        {command.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {command.description}
                      </span>
                    </span>
                    <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">
                      {command.prefix}
                    </kbd>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="relative flex items-start gap-2 px-4 pt-3">
          <SearchIcon
            aria-hidden="true"
            className="mt-[18px] h-5 w-5 shrink-0 text-muted-foreground"
          />
          <div className="relative min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              rows={1}
              role="combobox"
              aria-label="Search the marketplace or type / for commands"
              aria-expanded={paletteOpen || resultsOpen}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeDescendant}
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              onChange={(e) => {
                setValue(e.target.value.replace(/\n/g, ""));
                setResultsDismissed(false);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="block w-full resize-none overflow-hidden bg-transparent py-4 text-base text-foreground outline-none disabled:opacity-70 sm:text-[15px]"
              style={{ minHeight: 56 }}
            />
            {!value ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-4 truncate text-base text-muted-foreground sm:text-[15px]"
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
        </div>

        <AnimatePresence initial={false}>
          {resultsOpen ? (
            <motion.div
              key="results"
              id={listboxId}
              role="listbox"
              aria-label="Matching items"
              className="overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mx-3 border-t border-border py-2">
                {resultsLoading && results.length === 0 ? (
                  <div className="space-y-2 px-1 py-1">
                    {[0, 1].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                        <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : null}
                {results.map((result, index) => (
                  <a
                    key={result.id}
                    id={`${id}-opt-${index}`}
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
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                      active === index ? "bg-muted" : ""
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
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
                <button
                  id={`${id}-opt-${results.length}`}
                  type="button"
                  role="option"
                  aria-selected={active === results.length}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(results.length)}
                  onClick={() => void submit(value)}
                  className={cn(
                    "mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                    active === results.length
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <SearchIcon className="h-4 w-4 text-accent" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    {!resultsLoading && results.length === 0
                      ? "No quick matches — search the whole marketplace for "
                      : "See all results for "}
                    <span className="font-medium text-foreground">
                      “{searchQuery}”
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <motion.button
              ref={commandButtonRef}
              type="button"
              aria-label="Show commands"
              aria-pressed={paletteOpen}
              onClick={() => {
                setPaletteForced((open) => !open);
                textareaRef.current?.focus();
              }}
              whileTap={{ scale: 0.94 }}
              className={cn(
                "rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                paletteOpen && "bg-muted text-foreground"
              )}
            >
              <Command className="h-4 w-4" />
            </motion.button>
            <AnimatePresence mode="wait" initial={false}>
              {status ? (
                <motion.p
                  key="status"
                  role="status"
                  aria-live="polite"
                  className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground sm:text-sm"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  <span className="truncate">{status}</span>
                  <TypingDots />
                </motion.p>
              ) : (
                <motion.p
                  key="hint"
                  className="hidden truncate text-xs text-muted-foreground sm:block"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  Type{" "}
                  <kbd className="rounded border border-border px-1 font-mono text-[11px]">
                    /
                  </kbd>{" "}
                  for commands ·{" "}
                  <CornerDownLeft className="inline h-3 w-3 align-[-2px]" /> to
                  search
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="button"
            onClick={() => void submit(value)}
            whileTap={{ scale: 0.97 }}
            disabled={busy || !trimmed}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              trimmed || busy
                ? "bg-accent text-white shadow-sm hover:bg-accent-deep"
                : "bg-muted text-muted-foreground"
            )}
          >
            {busy ? (
              <LoaderIcon className="h-4 w-4 animate-[spin_1.4s_linear_infinite]" />
            ) : (
              <SearchIcon className="h-4 w-4" />
            )}
            <span>{submitLabel}</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
});

function TypingDots() {
  return (
    <span className="flex shrink-0 items-center" aria-hidden="true">
      {[1, 2, 3].map((dot) => (
        <motion.span
          key={dot}
          className="mx-0.5 h-1.5 w-1.5 rounded-full bg-accent"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

export default AnimatedAIChat;
