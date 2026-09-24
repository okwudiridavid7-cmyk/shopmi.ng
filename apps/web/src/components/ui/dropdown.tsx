"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./button";

export type DropdownItem = {
  id: string;
  label: string;
  href?: string;
  onSelect?: () => void;
  danger?: boolean;
  separator?: boolean;
  disabled?: boolean;
};

type DropdownProps = {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  label?: string;
};

export function Dropdown({
  trigger,
  items,
  align = "right",
  label = "Menu",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <Button
        variant="ghost"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="gap-token-2 px-token-2"
      >
        {trigger}
      </Button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute z-40 mt-token-2 min-w-[12rem] rounded-md border border-border bg-card py-token-1 shadow-md ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => {
            if (item.separator) {
              return (
                <div
                  key={item.id}
                  role="separator"
                  className="my-token-1 border-t border-border"
                />
              );
            }
            const className = `block w-full px-token-3 py-token-2 text-left text-sm transition hover:bg-muted ${
              item.disabled
                ? "cursor-default text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-transparent"
                : item.danger
                  ? "text-danger"
                  : "text-foreground"
            }`;
            if (item.disabled) {
              return (
                <div key={item.id} className={className} role="presentation">
                  {item.label}
                </div>
              );
            }
            if (item.href) {
              return (
                <a
                  key={item.id}
                  role="menuitem"
                  href={item.href}
                  className={className}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={className}
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
