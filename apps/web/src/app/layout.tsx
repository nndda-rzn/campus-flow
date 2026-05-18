import type { Metadata } from "next";
import {
  Inter,
  Poppins,
  IBM_Plex_Sans,
  JetBrains_Mono,
} from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
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
      className={`${inter.variable} ${poppins.variable} ${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
