"use client";

import { useId, useState } from "react";
import HowItWorks from "@/components/ui/how-it-works";
import { cn } from "@/lib/utils";

type Step = { title: string; body: string };

const THEMES = ["orange", "blue", "purple"] as const;

export function HowItWorksTabs({ tabs }: { tabs: { id: string; label: string; steps: Step[] }[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const baseId = useId();
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div role="tablist" aria-label="How it works" className="mx-auto flex w-fit rounded-full border border-border bg-card p-1">
        {tabs.map((t) => {
          const selected = t.id === current?.id;
          return (
            <button
              key={t.id}
              id={`${baseId}-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              onClick={() => setActive(t.id)}
              className={cn(
                "h-10 rounded-full px-5 text-sm font-semibold transition",
                selected ? "bg-[#141414] text-white dark:bg-white dark:text-[#141414]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${current?.id}`}>
        <HowItWorks
          key={current?.id}
          className="mt-4 px-0 max-lg:pb-0 max-lg:pt-6 lg:pb-0 lg:pt-10"
          features={(current?.steps ?? []).map((s, i) => ({
            title: s.title,
            description: s.body,
            colorTheme: THEMES[i % THEMES.length],
          }))}
        />
      </div>
    </div>
  );
}
