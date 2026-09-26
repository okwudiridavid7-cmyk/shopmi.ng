"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";

export type ToastTone = "default" | "info" | "success" | "warning" | "danger";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (opts: {
    title: string;
    description?: string;
    tone?: ToastTone;
    /** Auto-dismiss ms (default 4500). */
    duration?: number;
  }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneUi: Record<
  ToastTone,
  { wrap: string; icon: typeof Info; iconClass: string }
> = {
  default: {
    wrap: "border-border bg-card text-card-foreground",
    icon: Info,
    iconClass: "text-muted-foreground",
  },
  info: {
    wrap: "border-info/30 bg-card text-card-foreground",
    icon: Info,
    iconClass: "text-info",
  },
  success: {
    wrap: "border-success/35 bg-card text-card-foreground",
    icon: CheckCircle2,
    iconClass: "text-success",
  },
  warning: {
    wrap: "border-warning/40 bg-card text-card-foreground",
    icon: AlertTriangle,
    iconClass: "text-warning",
  },
  danger: {
    wrap: "border-danger/35 bg-card text-card-foreground",
    icon: XCircle,
    iconClass: "text-danger",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: {
      title: string;
      description?: string;
      tone?: ToastTone;
      duration?: number;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [
        ...prev.slice(-4),
        {
          id,
          title: opts.title,
          description: opts.description,
          tone: opts.tone ?? "default",
        },
      ]);
      window.setTimeout(() => dismiss(id), opts.duration ?? 4500);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-[80] flex w-[min(100%-2rem,24rem)] flex-col gap-2"
      >
        {items.map((item) => {
          const ui = toneUi[item.tone];
          const Icon = ui.icon;
          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm motion-safe:animate-scale-in ${ui.wrap}`}
              role="status"
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${ui.iconClass}`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
