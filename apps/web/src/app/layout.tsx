import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProviders } from "@/components/app-providers";
import { ToastProvider } from "@/components/ui/toast";
import { Walkthrough } from "@/components/walkthrough";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
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
      <body className={`${montserrat.variable} font-sans antialiased`}>
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
