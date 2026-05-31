"use client";

import Link from "next/link";
import { useEffect } from "react";
import { clearSession } from "@/lib/supabaseAuth";

interface Props {
  reason: string;
}

export default function LogoutClient({ reason }: Props) {
  useEffect(() => {
    clearSession();
  }, []);

  const timedOut = reason === "timeout";

  return (
    <section className="mx-auto w-full max-w-3xl py-4 sm:py-8">
      <article className="dashboard-shell panel-fade-up relative overflow-hidden rounded-[1.5rem] p-6 text-center sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-teal-200/35 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-14 -right-12 h-56 w-56 rounded-full bg-amber-200/30 blur-2xl" />

        <div className="relative z-10 mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-teal-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-7 w-7">
            <path d="M5 12h10" />
            <path d="M11 7l5 5-5 5" />
            <path d="M18 4v16" />
          </svg>
        </div>

        <p className="label-kicker relative z-10 mt-4">Logout</p>
        <h2 className="font-display relative z-10 mt-2 text-3xl font-semibold text-slate-900">Sessao encerrada</h2>
        <p className="relative z-10 mx-auto mt-3 max-w-md text-sm text-slate-600 sm:text-base">
          {timedOut
            ? "Sua sessao expirou por inatividade de 1 hora. Entre novamente para continuar a operacao."
            : "Voce saiu da plataforma com sucesso. Quando quiser, e so entrar novamente."}
        </p>

        <div className="relative z-10 mt-6 flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Voltar para login
          </Link>
        </div>
      </article>
    </section>
  );
}
