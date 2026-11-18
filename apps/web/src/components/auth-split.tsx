"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, Quote } from "lucide-react";
import { GrainGradient } from "@paper-design/shaders-react";
import { BrandMark } from "@/components/brand-mark";
import { useAppName } from "@/hooks/use-branding";

const AUTH_NOTES = [
  { quote: "Good style starts with feeling like yourself.", label: "A little style inspiration" },
  { quote: "The best finds feel like they were waiting for you.", label: "A thought for your next discovery" },
  { quote: "Shop local. Find something with a story.", label: "Good finds, closer to home" },
  { quote: "Look good. Feel good. Make it your own.", label: "Style starts with you" },
];

export function AuthSplitLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const appName = useAppName();
  const [noteIndex, setNoteIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let transitionTimer: number | undefined;
    const timer = window.setInterval(() => {
      setVisible(false);
      transitionTimer = window.setTimeout(() => {
        setNoteIndex((index) => (index + 1) % AUTH_NOTES.length);
        setVisible(true);
      }, 300);
    }, 11000);
    return () => {
      window.clearInterval(timer);
      if (transitionTimer) window.clearTimeout(transitionTimer);
    };
  }, []);
  const activeNote = AUTH_NOTES[noteIndex]!;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-zinc-950 lg:block">
        <GrainGradient
          speed={0.7}
          scale={1}
          rotation={0}
          offsetX={0}
          offsetY={0}
          softness={0.55}
          intensity={0.45}
          noise={0.2}
          shape="corners"
          colors={["#FFFFFF", "#16A36A", "#16A36A", "#FFFFFF"]}
          colorBack="#00000000"
          className="absolute inset-0 bg-zinc-950"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/20 via-zinc-950/25 to-zinc-950/85" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <BrandMark href="/" inverted />
          <div className="max-w-xl space-y-8 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Find something that feels like you</div>
            <div className={`min-h-56 transition-all duration-500 motion-reduce:transition-none ${visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`} aria-live="polite">
              <Quote className="mb-6 h-8 w-8 text-emerald-300" aria-hidden />
              <p className="max-w-lg font-display text-3xl font-semibold leading-tight xl:text-5xl">{activeNote.quote}</p>
              <p className="mt-5 text-sm font-medium text-white/70">{activeNote.label}</p>
            </div>
            <div className="flex items-center justify-between border-t border-white/20 pt-5 text-sm text-white/70">
              <p>{appName} helps sellers grow a storefront and buyers shop with confidence.</p>
              <ArrowUpRight className="ml-5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
            </div>
            <div className="flex gap-2" aria-hidden>{AUTH_NOTES.map((note, index) => <span key={note.label} className={`h-1 rounded-full transition-all ${index === noteIndex ? "w-8 bg-emerald-300" : "w-2 bg-white/35"}`} />)}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-background px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-[24rem] space-y-6">
          <div className="flex justify-center lg:hidden">
            <BrandMark href="/" className="justify-center [&_img]:mx-auto" />
          </div>
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
