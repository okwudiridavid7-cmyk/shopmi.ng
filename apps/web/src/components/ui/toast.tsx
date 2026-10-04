"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence } from "framer-motion";
import { AlertToast } from "@/components/ui/alert-toast";

export type ToastTone = "default" | "info" | "success" | "warning" | "danger";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastOptions = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Auto-dismiss ms (default 4500). */
  duration?: number;
};

type ToastContextValue = {
  toast: (opts: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneVariant = {
  default: "info",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "error",
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [
        ...prev.slice(-3),
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
      {/* Top right: the bottom corners hold the WhatsApp button and cookie banner. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-20 z-[95] flex w-[min(100%-2rem,24rem)] flex-col items-end gap-2 sm:right-6"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <AlertToast
              key={item.id}
              className="pointer-events-auto"
              variant={toneVariant[item.tone]}
              styleVariant="default"
              title={item.title}
              description={item.description}
              onClose={() => dismiss(item.id)}
            />
          ))}
        </AnimatePresence>
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
