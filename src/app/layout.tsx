import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artemis II Tracker — Live Mission Control",
  description: "Real-time mission tracking for NASA's Artemis II crewed lunar flyby mission.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main-content" className="skip-nav">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
