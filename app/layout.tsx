import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Space_Grotesk } from "next/font/google";
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
  title: "Radar CNPJ",
  description: "Dashboard de pesquisa e prospecção com dados da Minha Receita",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${manrope.variable} ${spaceGrotesk.variable} app-bg min-h-screen text-slate-900`}>
        <div className="atmosphere" aria-hidden="true" />
        <SessionTimeoutManager />

        <header className="border-b border-slate-200/70 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
            <div>
              <p className="label-kicker">Minha Receita</p>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Radar CNPJ
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Dashboard para consulta individual, pesquisa avançada e lote.
              </p>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                href="/busca"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
              >
                Busca
              </Link>
              <Link
                href="/crm"
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-slate-700"
              >
                CRM
              </Link>
              <Link
                href="/logout"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
              >
                Logout
              </Link>
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-right shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fonte de dados</p>
                <a
                  href="https://minhareceita.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display text-sm font-semibold text-slate-900 hover:text-amber-600"
                >
                  minhareceita.org
                </a>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</main>

        <footer className="mx-auto mt-6 w-full max-w-7xl border-t border-slate-200/80 px-4 py-6 text-center text-xs text-slate-500 sm:px-6">
          Dados publicos da Receita Federal via Minha Receita. Uso gratuito, sem garantia de disponibilidade.
        </footer>
      </body>
    </html>
  );
}
