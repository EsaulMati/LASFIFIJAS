import type { Metadata } from "next";
import { Exo_2, Expletus_Sans, Metrophobic } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { GlobalToaster } from "@/components/global-toaster";
import { SoundProvider } from "@/components/sound-provider";

const exo2 = Exo_2({
  variable: "--font-exo-2",
  subsets: ["latin"],
  display: "swap",
});
const expletus = Expletus_Sans({
  variable: "--font-expletus-sans",
  subsets: ["latin"],
  display: "swap",
});
const metrophobic = Metrophobic({
  variable: "--font-metrophobic",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Las Fifijas | Pronósticos deportivos",
  description: "Pronósticos, análisis deportivos y membresías Las Fifijas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${exo2.variable} ${expletus.variable} ${metrophobic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SoundProvider>
          <AuthProvider>{children}</AuthProvider>
          <GlobalToaster />
        </SoundProvider>
      </body>
    </html>
  );
}
