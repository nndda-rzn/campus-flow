import type { Metadata } from "next";
import {
  Atkinson_Hyperlegible,
  Crimson_Pro,
  JetBrains_Mono,
} from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

const crimson = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-crimson",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CampusFlow",
  description:
    "Sistem layanan akademik dan permohonan dosen pembimbing — alur kerja terstruktur dengan jejak audit lengkap.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${atkinson.variable} ${crimson.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
