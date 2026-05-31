import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import AppShell from "@/components/AppShell";
import SessionTimeoutManager from "@/components/SessionTimeoutManager";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AllProspect",
  description: "CRM e prospecção unificada por CNPJ e mapas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${manrope.variable} ${spaceGrotesk.variable} app-bg min-h-screen text-slate-900`}>
        <div className="atmosphere" aria-hidden="true" />
        <SessionTimeoutManager />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
