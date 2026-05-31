"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { fetchLeads, LeadStatus } from "@/lib/leads";

const STATUS_OPTIONS: LeadStatus[] = ["novo", "contatado", "qualificado", "proposta", "fechado", "perdido"];

function statusLabel(status: LeadStatus): string {
  const map: Record<LeadStatus, string> = {
    novo: "Novo",
    contatado: "Contatado",
    qualificado: "Qualificado",
    proposta: "Proposta",
    fechado: "Fechado",
    perdido: "Perdido",
  };
  return map[status];
}

function toneFor(status: LeadStatus) {
  switch (status) {
    case "novo":
      return "bg-slate-900";
    case "contatado":
      return "bg-cyan-500";
    case "qualificado":
      return "bg-emerald-500";
    case "proposta":
      return "bg-amber-500";
    case "fechado":
      return "bg-indigo-500";
    case "perdido":
      return "bg-rose-500";
  }
}

function sourceTone(source: "cnpj" | "maps") {
  return source === "cnpj" ? "bg-teal-500" : "bg-fuchsia-500";
}

export default function HomeDashboardPage() {
  const [leads, setLeads] = useState<Awaited<ReturnType<typeof fetchLeads>>>([]);

  useEffect(() => {
    let active = true;
    void fetchLeads().then((next) => {
      if (active) setLeads(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const next = STATUS_OPTIONS.reduce<Record<LeadStatus, number>>(
      (acc, status) => ({ ...acc, [status]: 0 }),
      { novo: 0, contatado: 0, qualificado: 0, proposta: 0, fechado: 0, perdido: 0 }
    );

    for (const lead of leads) {
      next[lead.status]++;
    }

    return next;
  }, [leads]);

  const sourceStats = useMemo(
    () => ({
      cnpj: leads.filter((lead) => lead.source === "cnpj").length,
      maps: leads.filter((lead) => lead.source === "maps").length,
    }),
    [leads]
  );

  const totalVisible = Math.max(1, leads.length);
  const conversion = useMemo(() => {
    if (!leads.length) return "0%";
    const won = leads.filter((lead) => lead.status === "fechado").length;
    return `${Math.round((won / leads.length) * 100)}%`;
  }, [leads]);

  return (
    <AuthGuard>
      <div className="space-y-5">
        <section className="dashboard-shell panel-fade-up p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-kicker">Dashboard</p>
              <h2 className="font-display mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                Visão geral do funil
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
                Acompanhe o pipeline em gráfico, veja a entrada por origem e acesse o CRM com um atalho direto.
              </p>
            </div>

            <Link
              href="/crm"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
            >
              Abrir CRM
            </Link>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.6fr,0.95fr]">
          <article className="panel-card p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label-kicker">Pipeline</p>
                <h3 className="font-display mt-1 text-xl font-semibold text-slate-900">Distribuição dos leads</h3>
              </div>
              <p className="text-sm text-slate-500">{leads.length} lead(s)</p>
            </div>

            <div className="mt-5 grid h-56 grid-cols-6 items-end gap-3 sm:h-64">
              {STATUS_OPTIONS.map((status) => {
                const count = stats[status];
                const height = `${Math.max(10, (count / totalVisible) * 100)}%`;
                return (
                  <div key={status} className="flex h-full flex-col items-center justify-end gap-2">
                    <div className="flex h-full w-full items-end justify-center rounded-2xl bg-slate-50 px-2 py-2">
                      <div className="flex h-full w-full flex-col justify-end">
                        <div className={`w-full rounded-t-2xl ${toneFor(status)}`} style={{ height }} />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{statusLabel(status)}</p>
                      <p className="text-lg font-semibold text-slate-900">{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <span key={status} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  <span className={`crm-kpi-pill ${toneFor(status)}`} />
                  {statusLabel(status)}
                </span>
              ))}
            </div>
          </article>

          <div className="grid gap-4">
            <article className="panel-card p-5 sm:p-6">
              <p className="label-kicker">Atalhos</p>
              <h3 className="font-display mt-1 text-xl font-semibold text-slate-900">Prospecção rápida</h3>
              <p className="mt-2 text-sm text-slate-600">
                Acesse os fluxos de captura de leads sem repetir atalho para o CRM.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/prospeccao-cnpj" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Prospectar CNPJ
                </Link>
                <Link href="/prospeccao-mapa" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Prospectar Mapa
                </Link>
              </div>
            </article>

            <article className="panel-card p-5 sm:p-6">
              <p className="label-kicker">Origens</p>
              <h3 className="font-display mt-1 text-xl font-semibold text-slate-900">Entrada por canal</h3>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">CNPJ</span>
                    <span className="text-slate-500">{sourceStats.cnpj}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div className={`h-3 rounded-full ${sourceTone("cnpj")}`} style={{ width: `${Math.max(20, (sourceStats.cnpj / totalVisible) * 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">Mapa</span>
                    <span className="text-slate-500">{sourceStats.maps}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div className={`h-3 rounded-full ${sourceTone("maps")}`} style={{ width: `${Math.max(20, (sourceStats.maps / totalVisible) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="panel-card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total de leads</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{leads.length}</p>
            <p className="mt-1 text-sm text-slate-600">Base atual do funil.</p>
          </article>
          <article className="panel-card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Em andamento</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.contatado + stats.qualificado + stats.proposta}</p>
            <p className="mt-1 text-sm text-slate-600">Leads em progresso comercial.</p>
          </article>
          <article className="panel-card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Fechados</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.fechado}</p>
            <p className="mt-1 text-sm text-slate-600">Oportunidades concluídas.</p>
          </article>
          <article className="panel-card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Conversão</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{conversion}</p>
            <p className="mt-1 text-sm text-slate-600">Percentual de leads fechados.</p>
          </article>
        </section>
      </div>
    </AuthGuard>
  );
}
