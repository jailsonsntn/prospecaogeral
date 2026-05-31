"use client";

import { FormEvent, useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { canUseSupabase, getCurrentOwnerId, supabaseFetch } from "@/lib/supabaseRest";

type ProfileSettings = {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
};

const STORAGE_KEY = "allprospect-profile-settings";

const DEFAULT_SETTINGS: ProfileSettings = {
  fullName: "",
  email: "",
  phone: "",
  companyName: "",
};

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      if (canUseSupabase()) {
        const ownerId = getCurrentOwnerId();
        if (ownerId) {
          const resp = await supabaseFetch(`profiles?select=full_name,email,phone,company_name&id=eq.${encodeURIComponent(ownerId)}&limit=1`);
          if (resp.ok) {
            const rows = (await resp.json()) as Array<{
              full_name: string | null;
              email: string | null;
              phone: string | null;
              company_name: string | null;
            }>;

            if (rows[0]) {
              setSettings({
                fullName: rows[0].full_name || "",
                email: rows[0].email || "",
                phone: rows[0].phone || "",
                companyName: rows[0].company_name || "",
              });
              return;
            }
          }
        }
      }

      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<ProfileSettings>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    };

    void load();
  }, []);

  function onChange<K extends keyof ProfileSettings>(key: K, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    if (canUseSupabase()) {
      const ownerId = getCurrentOwnerId();
      if (ownerId) {
        const resp = await supabaseFetch("profiles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify([
            {
              id: ownerId,
              full_name: settings.fullName,
              email: settings.email,
              phone: settings.phone,
              company_name: settings.companyName,
            },
          ]),
        });

        if (resp.ok) {
          setMessage("Configurações salvas no Supabase.");
          return;
        }
      }
    }

    setMessage("Configurações salvas localmente.");
  }

  return (
    <AuthGuard>
      <section className="dashboard-shell panel-fade-up mx-auto w-full max-w-3xl p-5 sm:p-7">
        <p className="label-kicker">Configurações</p>
        <h2 className="font-display mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Dados do seu cadastro</h2>
        <p className="mt-2 text-sm text-slate-600">
          Preencha os dados principais do seu perfil operacional para uso no CRM e nos fluxos de prospecção.
        </p>

        <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm text-slate-700 sm:col-span-2">
            Nome completo
            <input
              value={settings.fullName}
              onChange={(e) => onChange("fullName", e.target.value)}
              className="panel-input"
              placeholder="Seu nome"
            />
          </label>

          <label className="grid gap-1.5 text-sm text-slate-700">
            E-mail
            <input
              type="email"
              value={settings.email}
              onChange={(e) => onChange("email", e.target.value)}
              className="panel-input"
              placeholder="seu-email@dominio.com"
            />
          </label>

          <label className="grid gap-1.5 text-sm text-slate-700">
            Telefone
            <input
              value={settings.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              className="panel-input"
              placeholder="(00) 00000-0000"
            />
          </label>

          <label className="grid gap-1.5 text-sm text-slate-700 sm:col-span-2">
            Empresa
            <input
              value={settings.companyName}
              onChange={(e) => onChange("companyName", e.target.value)}
              className="panel-input"
              placeholder="Nome da empresa"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Salvar configurações
            </button>
          </div>
        </form>

        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}

        <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="label-kicker">Fonte de dados</p>
          <p className="mt-2 text-sm text-slate-600">
            Consultas de CNPJ utilizam dados públicos da Receita Federal via Minha Receita.
          </p>
          <a
            href="https://minhareceita.org"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Abrir minhareceita.org
          </a>
        </section>
      </section>
    </AuthGuard>
  );
}
