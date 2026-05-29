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

  return (
    <section className="dashboard-shell mx-auto w-full max-w-xl p-6 text-center sm:p-8">
      <p className="label-kicker">Logout</p>
      <h2 className="font-display mt-2 text-2xl font-semibold text-slate-900">Sessao encerrada</h2>
      <p className="mt-2 text-sm text-slate-600">
        {reason === "timeout"
          ? "Sua sessao expirou por inatividade de 1 hora."
          : "Voce saiu da plataforma com sucesso."}
      </p>

      <Link
        href="/"
        className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Voltar para login
      </Link>
    </section>
  );
}
