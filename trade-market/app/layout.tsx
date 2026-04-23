import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { TickerBanner } from "@/components/layout/ticker-banner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
  weight: ["300", "400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Trade Market · Cloudflow Servers",
  description: "Server marketplace integrated with Cloudflow API operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} dark`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider>
          <TickerBanner />
          <Navbar />
          <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 md:px-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
