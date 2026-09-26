"use client";

import { useEffect } from "react";
import NotFound06, {
  inferErrorPageKind,
} from "@/components/ui/not-found-06";

type Props = {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
};

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const kind = inferErrorPageKind(error);

  return (
    <NotFound06
      kind={kind}
      digest={error.digest}
      onRetry={reset}
      description={
        kind === "server"
          ? "We hit an unexpected error on our side. Try again, or visit a safer page."
          : undefined
      }
    />
  );
}
