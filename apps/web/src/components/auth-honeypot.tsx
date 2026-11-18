"use client";

import { useState } from "react";

/** Hidden bot trap for email/password authentication forms. */
export function useAuthHoneypot() {
  const [value, setValue] = useState("");
  const field = (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
    >
      <label htmlFor="auth-fax-number">Leave this field empty</label>
      <input
        id="auth-fax-number"
        name="faxNumber"
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoComplete="off"
        tabIndex={-1}
      />
    </div>
  );
  return { value, field };
}
