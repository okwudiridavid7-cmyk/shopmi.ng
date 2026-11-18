"use client";

import { useRef } from "react";
import { Bold, Italic, List, Underline } from "lucide-react";

export function RichMessageEditor({ onChange, placeholder = "Write your message…" }: { onChange: (html: string) => void; placeholder?: string }) {
  const editor = useRef<HTMLDivElement>(null);
  const format = (command: string) => {
    editor.current?.focus();
    document.execCommand(command);
    onChange(editor.current?.innerHTML ?? "");
  };
  return <div className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="flex gap-1 border-b border-border bg-muted/30 p-2">
      <button type="button" className="rounded-md p-2 hover:bg-muted" aria-label="Bold" onClick={() => format("bold")}><Bold className="h-4 w-4" /></button>
      <button type="button" className="rounded-md p-2 hover:bg-muted" aria-label="Italic" onClick={() => format("italic")}><Italic className="h-4 w-4" /></button>
      <button type="button" className="rounded-md p-2 hover:bg-muted" aria-label="Underline" onClick={() => format("underline")}><Underline className="h-4 w-4" /></button>
      <button type="button" className="rounded-md p-2 hover:bg-muted" aria-label="Bulleted list" onClick={() => format("insertUnorderedList")}><List className="h-4 w-4" /></button>
    </div>
    <div ref={editor} contentEditable suppressContentEditableWarning onInput={(e) => onChange(e.currentTarget.innerHTML)} data-placeholder={placeholder} className="min-h-48 p-4 text-sm leading-7 outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:text-accent [&_li]:ml-5 [&_ul]:list-disc [&_ol]:list-decimal" />
  </div>;
}
