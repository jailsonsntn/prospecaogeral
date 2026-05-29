"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSession, hasSupabaseConfig, saveSession, signInWithEmail, signUpWithEmail, validateSession } from "@/lib/supabaseAuth";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("jailsonjs55@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const current = getSession();
    if (!current) return;

    validateSession(current).then((valid) => {
      if (valid) {
        saveSession(valid);
        router.replace("/busca");
      } else {
        clearSession();
      }
    });
  }, [router]);

  async function handleSignUp() {
    if (!email.trim() || !password.trim()) {
      setMessage("Informe e-mail e senha.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const created = await signUpWithEmail(email.trim(), password);
      if (created) {
        saveSession(created);
        router.push("/busca");
        return;
      }
      setMessage("Conta criada. Verifique seu e-mail para confirmar e depois entre.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

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
      router.push("/busca");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dashboard-shell panel-fade-up mx-auto w-full max-w-2xl p-5 sm:p-7">
      <p className="label-kicker">Acesso</p>
      <h2 className="font-display mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Entrar no Radar CNPJ</h2>
      <p className="mt-2 text-sm text-slate-600">
        Faça login para acessar as buscas avançadas e o CRM de leads.
      </p>

      {!hasSupabaseConfig() ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para habilitar a autenticacao.
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu-email@dominio.com"
            className="panel-input"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            className="panel-input"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Criar conta
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </section>
  );
}
