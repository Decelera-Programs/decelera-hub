import type { Metadata } from "next";
import { Fustat, Taviraj } from "next/font/google";
import "./globals.css";
import { Spotlight } from "@/components/Spotlight";

const fustat = Fustat({
  variable: "--font-fustat",
  subsets: ["latin"],
});

const taviraj = Taviraj({
  variable: "--font-taviraj",
  weight: ["200", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Decelera Brain",
  description: "Brain: herramientas internas de Decelera",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${fustat.variable} ${taviraj.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col"><Spotlight />
        {children}
      </body>
    </html>
  );
}
