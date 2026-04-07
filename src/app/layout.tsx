import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocaleProvider } from "@/context/LocaleContext";
import { CookieConsent } from "@/components/CookieConsent";

export const metadata: Metadata = {
  title: "Artemis II Tracker — Live Mission Control",
  description: "Real-time mission control dashboard tracking NASA's Artemis II crewed lunar flyby. Live telemetry, DSN comms, orbit visualization, and crew activities.",
  icons: {
    icon: "/icon.png",
  },
  openGraph: {
    title: "Artemis II Tracker — Live Mission Control",
    description: "Real-time mission control dashboard tracking NASA's Artemis II crewed lunar flyby. Live telemetry, DSN comms, orbit visualization, and crew activities.",
    type: "website",
    siteName: "Canadian Space",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* GA is loaded dynamically by CookieConsent after user accepts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main-content" className="skip-nav">Skip to main content</a>
        <LocaleProvider>{children}</LocaleProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
