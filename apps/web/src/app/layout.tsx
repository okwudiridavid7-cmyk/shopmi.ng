import type { Metadata, Viewport } from "next";
import { Anton, DM_Sans, Fraunces, Inter, Montserrat } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProviders } from "@/components/app-providers";
import { ToastProvider } from "@/components/ui/toast";
import { Walkthrough } from "@/components/walkthrough";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

/* Storefront theme faces: only downloaded when a themed shop uses them. */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", preload: false });
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  preload: false,
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  preload: false,
});
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", preload: false });

const fontVars = [
  montserrat.variable,
  inter.variable,
  anton.variable,
  fraunces.variable,
  dmSans.variable,
].join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Shop local brands or open your online store`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    locale: "en_NG",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontVars} font-sans antialiased`}>
        <ThemeProvider>
          <AppProviders>
            <ToastProvider>
              {children}
              <Walkthrough />
            </ToastProvider>
          </AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
