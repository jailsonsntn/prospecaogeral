"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearSession,
  getSession,
  hasSupabaseConfig,
  saveSession,
  signInWithEmail,
  validateSession,
} from "@/lib/supabaseAuth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("jailsonjs55@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const hasConfig = hasSupabaseConfig();

  useEffect(() => {
    const current = getSession();
    if (!current) return;

    validateSession(current).then((valid) => {
      if (valid) {
        saveSession(valid);
        router.replace("/");
      } else {
        clearSession();
      }
    });
  }, [router]);

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      setMessage("Informe e-mail e senha.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const logged = await signInWithEmail(email.trim(), password);
      saveSession(logged);
      router.push("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl p-2 sm:p-4">
      <div className="grid gap-5 lg:grid-cols-[1.05fr,0.95fr]">
        <article className="panel-fade-up relative overflow-hidden rounded-[1.4rem] border border-teal-200/60 bg-gradient-to-br from-teal-900 via-cyan-900 to-slate-900 p-6 text-white shadow-[0_28px_70px_-45px_rgba(15,23,42,0.95)] sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full bg-amber-300/20 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />

          <p className="relative z-10 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">AllProspect</p>
          <h1 className="font-display relative z-10 mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            Prospecção e CRM
            <br />
            no mesmo cockpit
          </h1>
          <p className="relative z-10 mt-4 max-w-md text-sm text-cyan-50/85 sm:text-base">
            Organize funil, capture leads por CNPJ e Google Maps, e acelere a operação com IA em um fluxo único.
          </p>

          <div className="relative z-10 mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-100/75">Pipeline</p>
              <p className="mt-1 text-lg font-semibold">Kanban operacional</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-100/75">Inteligência</p>
              <p className="mt-1 text-lg font-semibold">Insights e ação</p>
            </div>
          </div>
        </article>

        <article className="dashboard-shell panel-fade-up-delay rounded-[1.4rem] p-5 sm:p-7">
          <p className="label-kicker">Acesso</p>
          <h2 className="font-display mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Entrar no AllProspect</h2>
          <p className="mt-2 text-sm text-slate-600">Use seu e-mail e senha para acessar o ambiente comercial.</p>

          {!hasConfig ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50/95 p-3 text-sm text-red-700">
              Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para habilitar a autenticação.
            </div>
          ) : (
            <form
              className="mt-5 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSignIn();
              }}
            >
              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu-email@dominio.com"
                  className="panel-input"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="panel-input"
                  autoComplete="current-password"
                />
              </div>

              <div className="mt-1 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  Entrar
                </button>
              </div>
            </form>
          )}

          {message && (
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {message}
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
