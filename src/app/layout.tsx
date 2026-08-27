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
  title: "Panel de control | Decelera",
  description: "Panel de control de dashboards de Decelera: Europe, Americas y Operational.",
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
