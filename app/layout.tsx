import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { APP_NAME, TAGLINE } from "@/lib/constants";
import AppProviders from "./providers";
import AppShell from "@/components/layout/AppShell";
import SentryUserTracker from "@/components/sentry/SentryUserTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gotlocks.com"),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[var(--app-bg)]">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} bg-[var(--app-bg)] text-[var(--app-text)] antialiased`}
      >
        <AppProviders>
          <SentryUserTracker />
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
