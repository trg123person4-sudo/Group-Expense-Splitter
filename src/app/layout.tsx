import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tally — Next-Gen Group Expense Splitter & AI Ledger",
  description:
    "Split group expenses with one-shot receipt OCR, verified AI ledger assistant, and animated minimal-transaction debt simplification.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${fraunces.variable} ${jetbrainsMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-sand-100 dark:bg-darkbg-base text-stone-900 dark:text-stone-100 font-sans selection:bg-terracotta-200 selection:text-terracotta-900 pb-16 sm:pb-0">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
