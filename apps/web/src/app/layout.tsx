import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProviders } from "@/components/app-providers";
import { ToastProvider } from "@/components/ui/toast";
import { Walkthrough } from "@/components/walkthrough";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Shopmi.ng",
  description: "Multitenant marketplace",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${fraunces.variable} font-sans`}>
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
