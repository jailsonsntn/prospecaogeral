"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { maskCnpj } from "@/lib/cnpj";
import { LeadChannel, LeadItem, LeadPriority, LeadStatus, fetchLeads, getLeadsEventName, removeLead, updateLead } from "@/lib/leads";

const STATUS_OPTIONS: LeadStatus[] = ["novo", "contato", "qualificado", "proposta", "fechado", "perdido"];
const CHANNEL_OPTIONS: LeadChannel[] = ["email", "whatsapp", "telefone", "outro"];
const PRIORITY_OPTIONS: LeadPriority[] = ["baixa", "media", "alta"];

function statusLabel(status: LeadStatus): string {
  const map: Record<LeadStatus, string> = {
    novo: "Novo",
    contato: "Em contato",
    qualificado: "Qualificado",
    proposta: "Proposta",
    fechado: "Fechado",
    perdido: "Perdido",
  };
  return map[status];
}

function channelLabel(channel: LeadChannel): string {
  const map: Record<LeadChannel, string> = {
    email: "E-mail",
    whatsapp: "WhatsApp",
    telefone: "Telefone",
    outro: "Outro",
  };
  return map[channel];
}

function priorityLabel(priority: LeadPriority): string {
  const map: Record<LeadPriority, string> = {
    baixa: "Baixa",
    media: "Media",
    alta: "Alta",
  };
  return map[priority];
}

export default function CrmPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    const reload = async () => {
      const next = await fetchLeads();
      if (active) setLeads(next);
    };

    void reload();

    const eventName = getLeadsEventName();
    window.addEventListener(eventName, reload);
    window.addEventListener("storage", reload);

    return () => {
      active = false;
      window.removeEventListener(eventName, reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const byStatus = statusFilter === "all" || lead.status === statusFilter;
      if (!byStatus) return false;

      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        lead.cnpj.toLowerCase().includes(q) ||
        lead.razaoSocial.toLowerCase().includes(q) ||
        lead.nomeFantasia.toLowerCase().includes(q) ||
        lead.municipio.toLowerCase().includes(q)
      );
    });
  }, [leads, query, statusFilter]);

  const stats = useMemo(() => {
    const byStatus = STATUS_OPTIONS.reduce<Record<LeadStatus, number>>(
      (acc, status) => ({ ...acc, [status]: 0 }),
      { novo: 0, contato: 0, qualificado: 0, proposta: 0, fechado: 0, perdido: 0 }
    );

    for (const lead of leads) {
      byStatus[lead.status]++;
    }

    return byStatus;
  }, [leads]);

  return (
    <AuthGuard>
      <div className="space-y-5">
      <section className="dashboard-shell p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-kicker">Gestão de Leads</p>
            <h2 className="font-display mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">CRM de Captação</h2>
            <p className="mt-2 text-sm text-slate-600">Trate os leads marcados no painel de consulta e avance no funil.</p>
          </div>

          <Link href="/busca" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Voltar para busca
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATUS_OPTIONS.map((status) => (
          <article key={status} className="panel-card p-3 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">{statusLabel(status)}</p>
            <p className="font-display mt-1 text-2xl font-semibold text-slate-900">{stats[status]}</p>
          </article>
        ))}
      </section>

      <section className="panel-card p-4">
        <div className="grid gap-3 md:grid-cols-[220px,1fr]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
            className="panel-input"
          >
            <option value="all">Todos os status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{statusLabel(status)}</option>
            ))}
          </select>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por CNPJ, razão social, nome fantasia ou cidade"
            className="panel-input"
          />
        </div>
      </section>

      <section className="panel-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            Nenhum lead encontrado. Marque leads na tabela de resultados clicando no CNPJ e use "Marcar como lead".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1480px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-[170px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">CNPJ</th>
                  <th className="w-[320px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</th>
                  <th className="w-[210px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contato</th>
                  <th className="w-[150px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="w-[150px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Prioridade</th>
                  <th className="w-[160px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Canal</th>
                  <th className="w-[180px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Próximo contato</th>
                  <th className="w-[280px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Observações</th>
                  <th className="w-[120px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((lead) => (
                  <tr key={lead.cnpj} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold text-teal-700">{maskCnpj(lead.cnpj)}</td>
                    <td className="px-3 py-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
                        <p className="line-clamp-2 font-semibold leading-tight text-slate-900">
                          {lead.razaoSocial || "-"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">
                          {lead.nomeFantasia || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {lead.municipio || "-"} / {lead.uf || "-"}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="space-y-1">
                        <p className="break-words">{lead.email || "-"}</p>
                        <p className="font-medium text-slate-900">{lead.telefone || "-"}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={lead.status}
                        onChange={async (e) => {
                          await updateLead(lead.cnpj, { status: e.target.value as LeadStatus });
                          setLeads(await fetchLeads());
                        }}
                        className="panel-input min-w-[130px]"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>{statusLabel(status)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={lead.prioridade}
                        onChange={async (e) => {
                          await updateLead(lead.cnpj, { prioridade: e.target.value as LeadPriority });
                          setLeads(await fetchLeads());
                        }}
                        className="panel-input min-w-[120px]"
                      >
                        {PRIORITY_OPTIONS.map((priority) => (
                          <option key={priority} value={priority}>{priorityLabel(priority)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={lead.canalPreferencial}
                        onChange={async (e) => {
                          await updateLead(lead.cnpj, { canalPreferencial: e.target.value as LeadChannel });
                          setLeads(await fetchLeads());
                        }}
                        className="panel-input min-w-[130px]"
                      >
                        {CHANNEL_OPTIONS.map((channel) => (
                          <option key={channel} value={channel}>{channelLabel(channel)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={lead.proximoContato}
                        onChange={async (e) => {
                          await updateLead(lead.cnpj, { proximoContato: e.target.value });
                          setLeads(await fetchLeads());
                        }}
                        className="panel-input min-w-[150px]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <textarea
                        value={lead.observacao}
                        onChange={async (e) => {
                          await updateLead(lead.cnpj, { observacao: e.target.value });
                          setLeads(await fetchLeads());
                        }}
                        rows={3}
                        placeholder="Próximo passo, abordagem, retorno..."
                        className="panel-input min-w-[220px]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await removeLead(lead.cnpj);
                          setLeads(await fetchLeads());
                        }}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </AuthGuard>
  );
}