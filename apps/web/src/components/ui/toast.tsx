"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "default" | "success" | "warning" | "danger";

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
  }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClass: Record<ToastTone, string> = {
  default: "border-border bg-card text-card-foreground",
  success: "border-success/40 bg-success-foreground text-success",
  warning: "border-warning/40 bg-warning-muted text-warning",
  danger: "border-danger/40 bg-danger-foreground text-danger",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback(
    (opts: { title: string; description?: string; tone?: ToastTone }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [
        ...prev,
        {
          id,
          title: opts.title,
          description: opts.description,
          tone: opts.tone ?? "default",
        },
      ]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-token-6 right-token-6 z-[60] flex w-full max-w-sm flex-col gap-token-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-md border px-token-4 py-token-3 shadow-md ${toneClass[item.tone]}`}
          >
            <p className="text-sm font-medium">{item.title}</p>
            {item.description && (
              <p className="mt-token-1 text-xs opacity-80">{item.description}</p>
            )}
          </div>
        ))}
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
