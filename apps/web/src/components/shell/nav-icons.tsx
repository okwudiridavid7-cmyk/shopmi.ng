import type { JSX, ReactNode, SVGProps } from "react";

export type NavIconProps = SVGProps<SVGSVGElement>;
export type NavIcon = (props: NavIconProps) => JSX.Element;

function Svg({ children, ...props }: NavIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const BagIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M5.5 8h13l-1 12.5h-11L5.5 8Z" />
    <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
  </Svg>
);

export const StorefrontIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M3.5 9.5 5 4.5h14l1.5 5" />
    <path d="M3.5 9.5c0 1.5 1.27 2.75 2.83 2.75S9.17 11 9.17 9.5c0 1.5 1.27 2.75 2.83 2.75s2.83-1.25 2.83-2.75c0 1.5 1.27 2.75 2.84 2.75S20.5 11 20.5 9.5" />
    <path d="M5 12.2v7.3h14v-7.3" />
    <path d="M10 19.5v-4h4v4" />
  </Svg>
);

export const HeartIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M12 20s-8-4.9-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.1 12 20 12 20Z" />
  </Svg>
);

export const BoxIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 20 7.5v9l-8 4-8-4v-9l8-4Z" />
    <path d="m4 7.5 8 4 8-4" />
    <path d="M12 11.5v9" />
    <path d="m8 5.5 8 4" />
  </Svg>
);

export const TagIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1.4 1.4 0 0 1 0 2l-6.6 6.6a1.4 1.4 0 0 1-2 0l-8.4-8Z" />
    <circle cx="8" cy="8" r="1.3" />
  </Svg>
);

export const DashboardIcon: NavIcon = (p) => (
  <Svg {...p}>
    <rect x="4" y="4" width="7" height="8" rx="1.5" />
    <rect x="13" y="4" width="7" height="5" rx="1.5" />
    <rect x="13" y="11" width="7" height="9" rx="1.5" />
    <rect x="4" y="14" width="7" height="6" rx="1.5" />
  </Svg>
);

export const PaletteIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.8-.8 1.8-1.8 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8h2.1a3.8 3.8 0 0 0 3.8-3.8C20.5 6.4 16.7 3.5 12 3.5Z" />
    <circle cx="7.5" cy="11.5" r=".9" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="7.7" r=".9" fill="currentColor" stroke="none" />
    <circle cx="14" cy="7.2" r=".9" fill="currentColor" stroke="none" />
  </Svg>
);

export const CardIcon: NavIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M3 10h18" />
    <path d="M7 14.5h3" />
  </Svg>
);

export const TruckIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M13.5 16.5V6H3v10.5h2.2" />
    <path d="M13.5 9.5h3.8l3.2 3.6v3.4h-1.7" />
    <path d="M8.8 16.5h6.4" />
    <circle cx="7" cy="17" r="1.8" />
    <circle cx="17" cy="17" r="1.8" />
  </Svg>
);

export const MegaphoneIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M4 10v3.5a1 1 0 0 0 1 1h2.2l8.3 4.5V4.5L7.2 9H5a1 1 0 0 0-1 1Z" />
    <path d="m7.5 14.5 1.2 4.5h2.1l-.9-4" />
    <path d="M18.5 9.3a3.4 3.4 0 0 1 0 5" />
  </Svg>
);

export const BadgeIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 14.2 5l2.6-.2.9 2.5 2.1 1.6-.8 2.5.8 2.5-2.1 1.6-.9 2.5-2.6-.2L12 20.5 9.8 19l-2.6.2-.9-2.5-2.1-1.6.8-2.5-.8-2.5 2.1-1.6.9-2.5 2.6.2L12 3.5Z" />
    <path d="m9 12.2 2.1 2.1 4-4.1" />
  </Svg>
);

export const SearchIcon: NavIcon = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Svg>
);

export const BuildingIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 15 5v15.5" />
    <path d="M15 9.5h3a1.5 1.5 0 0 1 1.5 1.5v9.5" />
    <path d="M3.5 20.5h17" />
    <path d="M8.5 7.5h3M8.5 11h3M8.5 14.5h3" />
  </Svg>
);

export const MailIcon: NavIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </Svg>
);

export const ChatIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M12 4a8 8 0 0 0-6.9 12.05L4 20l4.05-1.07A8 8 0 1 0 12 4Z" />
    <path d="M9 10.5h6M9 13.5h4" />
  </Svg>
);

export const HeadsetIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" />
    <path d="M4.5 13.5h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H6a1.5 1.5 0 0 1-1.5-1.5v-3.5Z" />
    <path d="M19.5 13.5h-2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h.5a1.5 1.5 0 0 0 1.5-1.5v-3.5Z" />
    <path d="M18 18.5c0 1.4-1.4 2-3.5 2H12" />
  </Svg>
);

export const DocumentIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3.5Z" />
    <path d="M14 3.5V8h4.5" />
    <path d="M9 12.5h6M9 16h6" />
  </Svg>
);

export const QuestionIcon: NavIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.7 9.6a2.4 2.4 0 0 1 4.6.9c0 1.6-2.3 2-2.3 3.5" />
    <circle cx="12" cy="16.9" r=".9" fill="currentColor" stroke="none" />
  </Svg>
);

export const CookieIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M20.4 12.6A8.5 8.5 0 1 1 11.4 3.6a3 3 0 0 0 3.6 3.6 3 3 0 0 0 5.4 5.4Z" />
    <circle cx="8.5" cy="10" r=".9" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="15" r=".9" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="14.5" r=".9" fill="currentColor" stroke="none" />
  </Svg>
);

export const UsersIcon: NavIcon = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19.5c.4-3.2 2.6-5.2 5.5-5.2s5.1 2 5.5 5.2" />
    <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8" />
    <path d="M17.2 14.6c1.9.6 3 2.3 3.3 4.9" />
  </Svg>
);

export const ChartIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M4 4v15.5a.5.5 0 0 0 .5.5H20" />
    <path d="m7.5 14.5 3.5-3.5 3 3 5-5.5" />
    <path d="M15.5 8.5H19V12" />
  </Svg>
);

export const GlobeIcon: NavIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.3 2.3 3.5 5.2 3.5 8.5s-1.2 6.2-3.5 8.5c-2.3-2.3-3.5-5.2-3.5-8.5S9.7 5.8 12 3.5Z" />
  </Svg>
);

export const PenIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M14.5 5.5 18.5 9.5" />
    <path d="M4 20l1-4.5L16 4.5a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L8.5 19 4 20Z" />
    <path d="M13 20h7" />
  </Svg>
);

export const ReceiptIcon: NavIcon = (p) => (
  <Svg {...p}>
    <path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3v-17Z" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
  </Svg>
);

export const PosIcon: NavIcon = (p) => (
  <Svg {...p}>
    <rect x="6" y="3.5" width="12" height="17" rx="2" />
    <rect x="8.5" y="6" width="7" height="4" rx=".8" />
    <path d="M9 13.5h.01M12 13.5h.01M15 13.5h.01M9 16.5h.01M12 16.5h.01M15 16.5h.01" strokeWidth={2} />
  </Svg>
);

/** Soft pastel discs behind the line icons; cycled per item. */
export const NAV_ICON_TONES = [
  "bg-[#fde7ea]",
  "bg-[#e4f3ea]",
  "bg-[#fff3d9]",
  "bg-[#e6effc]",
  "bg-[#efe9fb]",
] as const;
