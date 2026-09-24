"use client";

import type { ReactNode } from "react";

function isHeading(block: string): boolean {
  return /^\d+(\.\d+)?\.\s+\S/.test(block.trim());
}

function renderBlock(block: string, key: number): ReactNode {
  const trimmed = block.trim();
  if (isHeading(trimmed)) {
    const firstLineEnd = trimmed.indexOf("\n");
    if (firstLineEnd === -1) {
      return (
        <h2
          key={key}
          className="scroll-mt-24 pt-token-4 font-display text-xl text-foreground"
        >
          {trimmed}
        </h2>
      );
    }
    const title = trimmed.slice(0, firstLineEnd);
    const rest = trimmed.slice(firstLineEnd + 1).trim();
    return (
      <div key={key} className="space-y-token-3 pt-token-4">
        <h2 className="scroll-mt-24 font-display text-xl text-foreground">
          {title}
        </h2>
        {rest ? renderBody(rest, `${key}-body`) : null}
      </div>
    );
  }
  return (
    <div key={key} className="space-y-token-3">
      {renderBody(trimmed, String(key))}
    </div>
  );
}

function renderBody(text: string, keyPrefix: string): ReactNode {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    nodes.push(
      <p key={`${keyPrefix}-p-${nodes.length}`} className="whitespace-pre-wrap">
        {para.join("\n")}
      </p>
    );
    para = [];
  };
  const flushList = () => {
    if (!list.length) return;
    nodes.push(
      <ul
        key={`${keyPrefix}-ul-${nodes.length}`}
        className="list-disc space-y-token-2 pl-token-5"
      >
        {list.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
    list = [];
  };

  for (const line of lines) {
    const bullet = line.match(/^\*\s+(.*)$/);
    if (bullet) {
      flushPara();
      list.push(bullet[1]);
    } else if (!line.trim()) {
      flushList();
      flushPara();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushList();
  flushPara();
  return nodes;
}

export function LegalDoc({ title, body }: { title: string; body: string }) {
  const blocks = body.split(/\n\n+/).filter(Boolean);

  // Drop duplicate title line if body starts with the same policy name.
  let start = 0;
  if (
    blocks[0] &&
    /privacy policy|terms of service|terms of sale/i.test(blocks[0]) &&
    blocks[0].length < 80
  ) {
    start = 1;
  }

  const rest = blocks.slice(start);

  return (
    <article className="mx-auto max-w-3xl space-y-token-5 px-token-4 py-12 sm:px-token-6 sm:py-16">
      <header className="space-y-token-3 border-b border-border pb-token-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Legal
        </p>
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">
          {title}
        </h1>
      </header>
      <div className="space-y-token-4 text-sm leading-relaxed text-muted-foreground">
        {rest.map((block, i) => renderBlock(block, i))}
      </div>
    </article>
  );
}
