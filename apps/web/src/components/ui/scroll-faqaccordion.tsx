"use client";

import * as React from "react";
import { motion } from "framer-motion";
import * as Accordion from "@radix-ui/react-accordion";
import { Minus, Plus } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
  icon?: string;
  iconPosition?: "left" | "right";
}

interface ScrollFAQAccordionProps {
  data?: FAQItem[];
  /** Replaces the default heading and intro. */
  header?: React.ReactNode;
  className?: string;
  questionClassName?: string;
  answerClassName?: string;
  /** Scroll distance in px given to each question while the list is pinned. */
  scrollPerItem?: number;
  /** Distance from the viewport top where the list pins, e.g. to clear a sticky header. */
  pinOffset?: number;
}

const DEFAULT_DATA: FAQItem[] = [
  {
    id: 1,
    question: "What is Ruixen UI?",
    answer:
      "Ruixen UI is a sleek and modern UI component library built with React and Tailwind CSS, designed to help developers create beautiful, responsive, and accessible web applications faster.",
  },
  {
    id: 2,
    question: "How do I install Ruixen UI?",
    answer: "You can install Ruixen UI via your terminal using npm or yarn: `npm install ruixenui` or `yarn add ruixenui`.",
  },
  {
    id: 3,
    question: "Is Ruixen UI open-source?",
    answer:
      "Yes, Ruixen UI is completely open-source and available under the MIT license. You're free to use it in both personal and commercial projects.",
  },
  {
    id: 4,
    question: "Where can I find the documentation?",
    answer: "You can find full documentation, usage examples, and component APIs at our official site: docs.ruixenui.com.",
  },
  {
    id: 5,
    question: "Can I contribute to Ruixen UI?",
    answer:
      "Definitely! Ruixen UI thrives on community support. Visit our GitHub repository to explore contribution guidelines, report issues, or submit pull requests.",
  },
];

export default function ScrollFAQAccordion({
  data = DEFAULT_DATA,
  header,
  className,
  questionClassName,
  answerClassName,
  scrollPerItem = 200,
  pinOffset = 0,
}: ScrollFAQAccordionProps) {
  const [openItem, setOpenItem] = React.useState<string>(data[0] ? String(data[0].id) : "");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Pinned scroll-through only where there is room for it and motion is welcome; elsewhere it is a plain accordion.
  useGSAP(
    () => {
      if (!containerRef.current || data.length === 0) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        ScrollTrigger.create({
          trigger: containerRef.current,
          start: `top top+=${pinOffset}`,
          end: `+=${data.length * scrollPerItem}`,
          pin: true,
          onUpdate: (self) => {
            const index = Math.min(data.length - 1, Math.floor(self.progress * data.length));
            const item = data[index];
            if (item) setOpenItem(String(item.id));
          },
        });
      });
      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [data, scrollPerItem, pinOffset] }
  );

  return (
    <div ref={containerRef} className={cn("mx-auto max-w-4xl py-16 text-center", className)}>
      {header ?? (
        <>
          <h2 className="mb-2 text-3xl font-bold">
            <a
              href="https://github.com/ruixenui/ruixen-free-components"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-blue-400"
            >
              Frequently Asked Questions
            </a>
          </h2>
          <p className="mb-6 text-muted-foreground">
            Find answers to common questions about our graphic assets, components, and licensing.
          </p>
        </>
      )}

      <Accordion.Root
        type="single"
        collapsible
        value={openItem}
        onValueChange={setOpenItem}
        className="text-left"
      >
        {data.map((item) => {
          const open = openItem === String(item.id);
          return (
            <Accordion.Item value={String(item.id)} key={item.id} className="mb-5">
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-start gap-x-4 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <div
                    className={cn(
                      "relative flex items-center space-x-2 rounded-xl border px-3.5 py-2.5 transition-colors",
                      open
                        ? "border-transparent bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] text-accent-strong dark:text-accent-on-dark"
                        : "border-border bg-card text-foreground group-hover:border-[color-mix(in_oklab,var(--color-foreground)_25%,transparent)]",
                      questionClassName
                    )}
                  >
                    {item.icon && (
                      <span
                        className={cn("absolute bottom-6", item.iconPosition === "right" ? "right-0" : "left-0")}
                        style={{ transform: item.iconPosition === "right" ? "rotate(7deg)" : "rotate(-4deg)" }}
                      >
                        {item.icon}
                      </span>
                    )}
                    <span className="font-medium">{item.question}</span>
                  </div>

                  <span
                    aria-hidden
                    className={cn("shrink-0", open ? "text-accent-strong dark:text-accent-on-dark" : "text-muted-foreground")}
                  >
                    {open ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  </span>
                </Accordion.Trigger>
              </Accordion.Header>

              <Accordion.Content asChild forceMount>
                <motion.div
                  hidden={false}
                  aria-hidden={!open}
                  initial={false}
                  animate={open ? "open" : "collapsed"}
                  variants={{
                    open: { opacity: 1, height: "auto" },
                    collapsed: { opacity: 0, height: 0 },
                  }}
                  transition={{ duration: 0.4 }}
                  className="overflow-hidden"
                >
                  <div className="ml-7 mt-3 flex justify-end md:ml-16">
                    <div
                      className={cn(
                        "relative max-w-md rounded-2xl rounded-br-md bg-accent-strong px-4 py-2.5 text-base leading-relaxed text-white",
                        answerClassName
                      )}
                    >
                      {item.answer}
                    </div>
                  </div>
                </motion.div>
              </Accordion.Content>
            </Accordion.Item>
          );
        })}
      </Accordion.Root>
    </div>
  );
}
