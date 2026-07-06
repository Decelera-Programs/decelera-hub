import type { Metadata } from "next";
import { Fustat, Taviraj } from "next/font/google";
import "./globals.css";

const fustat = Fustat({
  variable: "--font-fustat",
  subsets: ["latin"],
});

const taviraj = Taviraj({
  variable: "--font-taviraj",
  weight: ["500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Opencall México 2026 | Decelera",
  description: "Dashboard de seguimiento de la opencall México 2026 de Decelera",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${fustat.variable} ${taviraj.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
