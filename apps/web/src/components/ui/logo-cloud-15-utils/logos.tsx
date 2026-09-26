import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

type LogoProps = SVGProps<SVGSVGElement>;

/** Shopmi.ng wordmark for marketplace surfaces. */
export function ShopLogoMark({ className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 140 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Shopmi.ng"
      className={cn("h-8 w-auto text-foreground", className)}
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="#ff822e" />
      <path
        d="M10 11.5c0-1.4 1.2-2.5 2.8-2.5h6.4c1.6 0 2.8 1.1 2.8 2.5v1.2c0 1.4-1.2 2.5-2.8 2.5h-3.6c-1.6 0-2.8 1.1-2.8 2.5v1.2c0 1.4 1.2 2.5 2.8 2.5h6.4c1.6 0 2.8-1.1 2.8-2.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x="40"
        y="22"
        fill="currentColor"
        fontFamily="Montserrat, ui-sans-serif, sans-serif"
        fontSize="14"
        fontWeight="700"
      >
        Shopmi.ng
      </text>
    </svg>
  );
}

function AbstractLogo({
  label,
  className,
  children,
  ...props
}: LogoProps & { label: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={label}
      className={cn("h-10 w-auto text-foreground/70", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

export function Logo01(props: LogoProps) {
  return (
    <AbstractLogo label="Nova" {...props}>
      <circle cx="16" cy="20" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="20" r="4" fill="currentColor" />
      <text
        x="34"
        y="25"
        fill="currentColor"
        fontFamily="Montserrat, ui-sans-serif, sans-serif"
        fontSize="16"
        fontWeight="600"
      >
        Nova
      </text>
    </AbstractLogo>
  );
}

export function Logo02(props: LogoProps) {
  return (
    <AbstractLogo label="Pulse" {...props}>
      <path
        d="M6 20h6l3-8 4 16 3-8h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="48"
        y="25"
        fill="currentColor"
        fontFamily="Montserrat, ui-sans-serif, sans-serif"
        fontSize="16"
        fontWeight="600"
      >
        Pulse
      </text>
    </AbstractLogo>
  );
}

export function Logo03(props: LogoProps) {
  return (
    <AbstractLogo label="Orbit" {...props}>
      <rect
        x="6"
        y="10"
        width="20"
        height="20"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M10 20h12M16 14v12" stroke="currentColor" strokeWidth="2" />
      <text
        x="34"
        y="25"
        fill="currentColor"
        fontFamily="Montserrat, ui-sans-serif, sans-serif"
        fontSize="16"
        fontWeight="600"
      >
        Orbit
      </text>
    </AbstractLogo>
  );
}

export function Logo04(props: LogoProps) {
  return (
    <AbstractLogo label="Forge" {...props}>
      <path
        d="M8 28V12l8 8 8-8v16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="34"
        y="25"
        fill="currentColor"
        fontFamily="Montserrat, ui-sans-serif, sans-serif"
        fontSize="16"
        fontWeight="600"
      >
        Forge
      </text>
    </AbstractLogo>
  );
}

export function Logo05(props: LogoProps) {
  return (
    <AbstractLogo label="Aether" {...props}>
      <path
        d="M16 8l10 20H6L16 8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text
        x="34"
        y="25"
        fill="currentColor"
        fontFamily="Montserrat, ui-sans-serif, sans-serif"
        fontSize="16"
        fontWeight="600"
      >
        Aether
      </text>
    </AbstractLogo>
  );
}

export function Logo06(props: LogoProps) {
  return (
    <AbstractLogo label="Nimbus" {...props}>
      <path
        d="M10 22a6 6 0 019-5 5 5 0 018 5H10z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text
        x="36"
        y="25"
        fill="currentColor"
        fontFamily="Montserrat, ui-sans-serif, sans-serif"
        fontSize="16"
        fontWeight="600"
      >
        Nimbus
      </text>
    </AbstractLogo>
  );
}

export function Logo07(props: LogoProps) {
  return (
    <AbstractLogo label="Vertex" {...props}>
      <path
        d="M6 28l10-20 10 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 22h12" stroke="currentColor" strokeWidth="2" />
      <text
        x="34"
        y="25"
        fill="currentColor"
        fontFamily="Montserrat, ui-sans-serif, sans-serif"
        fontSize="16"
        fontWeight="600"
      >
        Vertex
      </text>
    </AbstractLogo>
  );
}

export function Logo08(props: LogoProps) {
  return (
    <AbstractLogo label="Lumen" {...props}>
      <circle cx="16" cy="20" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16 11v18M7 20h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x="34"
        y="25"
        fill="currentColor"
        fontFamily="Montserrat, ui-sans-serif, sans-serif"
        fontSize="16"
        fontWeight="600"
      >
        Lumen
      </text>
    </AbstractLogo>
  );
}
