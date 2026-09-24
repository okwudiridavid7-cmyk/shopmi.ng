"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export type ShareButtonProps = {
  title?: string;
  text?: string;
  url?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  onShared?: (result: "shared" | "copied") => void;
  children?: React.ReactNode;
};

/** Share via Web Share API, falling back to clipboard copy. */
export function ShareButton({
  title,
  text,
  url,
  variant = "outline",
  size = "md",
  className = "",
  onShared,
  children,
}: ShareButtonProps) {
  const [busy, setBusy] = useState(false);

  async function share() {
    const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
    setBusy(true);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title,
          text: text ?? title,
          url: shareUrl,
        });
        onShared?.("shared");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      onShared?.("copied");
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        onShared?.("copied");
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={busy}
      onClick={() => void share()}
    >
      {children ?? (
        <>
          <Share2 className="mr-1.5 h-4 w-4" aria-hidden />
          Share
        </>
      )}
    </Button>
  );
}
