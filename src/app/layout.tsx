import type { Metadata } from "next";
import localFont from "next/font/local";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

const dmSerif = localFont({
  src: "../../public/fonts/dm-serif-display-latin.woff2",
  variable: "--font-dm-serif",
  weight: "400",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const inter = localFont({
  src: "../../public/fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
  fallback: ["Segoe UI", "Arial", "sans-serif"],
});

const jetbrainsMono = localFont({
  src: "../../public/fonts/jetbrains-mono-latin.woff2",
  variable: "--font-jetbrains",
  weight: "100 800",
  display: "swap",
  fallback: ["Consolas", "monospace"],
});

export const metadata: Metadata = {
  title: { default: "CAL — Tax, Accounting & Business Consulting", template: "%s | CAL" },
  applicationName: "CAL",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  description: "Platform all-in-one untuk konsultan pajak: kelola klien, hitung pajak, pantau deadline, buat invoice, dan kelola dokumen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${dmSerif.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <SessionProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
