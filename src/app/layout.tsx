import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ConditionalHeader } from "@/components/layout/ConditionalHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "10xCards - Twórz fiszki 10x szybciej z AI",
  description:
    "Przekształć dowolny tekst w wysokiej jakości fiszki dzięki sztucznej inteligencji. Ucz się efektywniej i oszczędzaj czas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConditionalHeader />
        {children}
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
