"use client";

import { useEffect } from "react";
import NotFound06, {
  inferErrorPageKind,
} from "@/components/ui/not-found-06";

type Props = {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
};

/** Root-level fallback when the root layout itself fails. */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const kind = inferErrorPageKind(error);

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <NotFound06
          kind={kind === "not_found" ? "server" : kind}
          digest={error.digest}
          onRetry={reset}
        />
      </body>
    </html>
  );
}
