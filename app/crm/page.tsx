"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { maskCnpj } from "@/lib/cnpj";
import { CrmTag, fetchLeadTagIds, fetchTags } from "@/lib/crmExtras";
import {
  LeadChannel,
  LeadItem,
  LeadPriority,
  LeadSource,
  LeadStatus,
  fetchLeads,
  getLeadsEventName,
  removeLead,
  updateLead,
} from "@/lib/leads";

const STATUS_OPTIONS: LeadStatus[] = ["novo", "contatado", "qualificado", "proposta", "fechado", "perdido"];
const CHANNEL_OPTIONS: LeadChannel[] = ["email", "whatsapp", "telefone", "outro"];
const PRIORITY_OPTIONS: LeadPriority[] = ["baixa", "media", "alta"];
const SOURCE_OPTIONS: Array<LeadSource | "all"> = ["all", "cnpj", "maps"];

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
    media: "Média",
    alta: "Alta",
  };
  return map[priority];
}

function sourceLabel(source: LeadSource): string {
  return source === "cnpj" ? "CNPJ" : "Mapa";
}

function metricTone(key: LeadStatus) {
  switch (key) {
    case "novo":
      return { bar: "bg-slate-900", glow: "from-slate-50 to-white" };
    case "contatado":
      return { bar: "bg-cyan-500", glow: "from-cyan-50 to-white" };
    case "qualificado":
      return { bar: "bg-emerald-500", glow: "from-emerald-50 to-white" };
    case "proposta":
      return { bar: "bg-amber-500", glow: "from-amber-50 to-white" };
    case "fechado":
      return { bar: "bg-indigo-500", glow: "from-indigo-50 to-white" };
    case "perdido":
      return { bar: "bg-rose-500", glow: "from-rose-50 to-white" };
  }
}

function inlineTagInfo(tags: CrmTag[] | undefined): { first: CrmTag | null; extra: number } {
  if (!tags || tags.length === 0) return { first: null, extra: 0 };
  return { first: tags[0], extra: Math.max(tags.length - 1, 0) };
}

function Icon({ name }: { name: "company" | "source" | "location" | "contact" | "move" | "open" | "calendar" | "filter" }) {
  const common = "h-3.5 w-3.5 shrink-0";
  switch (name) {
    case "company":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M4 21V5h10v16" />
          <path d="M14 9h6v12" />
          <path d="M8 9h2M8 13h2M8 17h2M18 13h2M18 17h2" />
        </svg>
      );
    case "source":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M5 6h14v12H5z" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      );
    case "location":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M12 21s5-4.6 5-10a5 5 0 0 0-10 0c0 5.4 5 10 5 10Z" />
          <circle cx="12" cy="11" r="1.8" />
        </svg>
      );
    case "contact":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M4 7.5h16v9H4z" />
          <path d="m4 8 8 5 8-5" />
        </svg>
      );
    case "move":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M5 9h14" />
          <path d="M13 5l4 4-4 4" />
          <path d="M19 15H5" />
          <path d="M11 11l-4 4 4 4" />
        </svg>
      );
    case "open":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M14 5h5v5" />
          <path d="M10 14 19 5" />
          <path d="M5 7v12h12" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M7 3v3M17 3v3M4 8h16" />
          <path d="M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case "filter":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </svg>
      );
  }
}

export default function CrmPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [leadTags, setLeadTags] = useState<Record<string, CrmTag[]>>({});
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"lista" | "grade" | "kanban">("grade");
  const [visibleKanbanStatuses, setVisibleKanbanStatuses] = useState<LeadStatus[]>([...STATUS_OPTIONS]);
  const [kanbanDensity, setKanbanDensity] = useState<"compact" | "normal" | "wide">("normal");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedLeadKey, setSelectedLeadKey] = useState("");
  const [draggedLeadKey, setDraggedLeadKey] = useState("");
  const [dragTargetStatus, setDragTargetStatus] = useState<LeadStatus | "">("");

  useEffect(() => {
    let active = true;

    const hydrateLeadTags = async (nextLeads: LeadItem[]) => {
      if (!active) return;
      if (nextLeads.length === 0) {
        setLeadTags({});
        return;
      }

      const allTags = await fetchTags();
      const tagsById = new Map(allTags.map((tag) => [tag.id, tag]));
      const entries = await Promise.all(
        nextLeads.map(async (lead) => {
          if (!lead.id) return [lead.cnpj, []] as const;
          const tagIds = await fetchLeadTagIds(lead.id);
          const tags = tagIds
            .map((tagId) => tagsById.get(tagId))
            .filter((tag): tag is CrmTag => Boolean(tag));
          return [lead.cnpj, tags] as const;
        })
      );

      if (!active) return;
      setLeadTags(Object.fromEntries(entries));
    };

    const reload = async () => {
      const next = await fetchLeads();
      if (!active) return;
      setLeads(next);
      await hydrateLeadTags(next);

      if (selectedLeadKey && !next.some((lead) => lead.cnpj === selectedLeadKey)) {
        setSelectedLeadKey("");
      }

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
  }, [selectedLeadKey]);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.cnpj === selectedLeadKey) || null,
    [leads, selectedLeadKey]
  );

  useEffect(() => {
    if (!selectedLeadKey) return;
    if (selectedLead) return;
    setSelectedLeadKey("");
  }, [selectedLead, selectedLeadKey]);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const byStatus = statusFilter === "all" || lead.status === statusFilter;
      if (!byStatus) return false;

      const bySource = sourceFilter === "all" || lead.source === sourceFilter;
      if (!bySource) return false;

      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        lead.cnpj.toLowerCase().includes(q) ||
        lead.razaoSocial.toLowerCase().includes(q) ||
        lead.nomeFantasia.toLowerCase().includes(q) ||
        lead.municipio.toLowerCase().includes(q) ||
        lead.telefone.toLowerCase().includes(q)
      );
    });
  }, [leads, query, sourceFilter, statusFilter]);

  const kanbanByStatus = useMemo(() => {
    return STATUS_OPTIONS.filter((status) => visibleKanbanStatuses.includes(status)).map((status) => ({
      status,
      items: filtered.filter((lead) => lead.status === status),
    }));
  }, [filtered, visibleKanbanStatuses]);

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (query.trim() ? 1 : 0) +
    (viewMode !== "lista" ? 1 : 0);

  async function reloadLeads() {
    setLeads(await fetchLeads());
  }

  async function moveLeadToStatus(leadKey: string, nextStatus: LeadStatus) {
    const currentLead = leads.find((lead) => lead.cnpj === leadKey);
    if (!currentLead || currentLead.status === nextStatus) return;
    await updateLead(leadKey, { status: nextStatus });
    await reloadLeads();
  }

  return (
    <AuthGuard>
      <div className="space-y-4">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Filtros e visualização</span>
            {activeFiltersCount > 0 && (
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-teal-800">
                {activeFiltersCount} ativo(s)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setSourceFilter("all");
                  setQuery("");
                  setViewMode("grade");
                  setVisibleKanbanStatuses([...STATUS_OPTIONS]);
                  setKanbanDensity("normal");
                }}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpar
              </button>
            )}

          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            className="relative inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-slate-700 hover:bg-slate-50"
            aria-label="Abrir filtros"
            title="Filtros"
          >
            <Icon name="filter" />
            <span className="hidden text-xs font-semibold sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-teal-700 px-1 text-[10px] font-semibold text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="panel-card p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-[220px,220px,1fr]">
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

              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as LeadSource | "all")}
                className="panel-input"
              >
                {SOURCE_OPTIONS.map((source) => (
                  <option key={source} value={source}>
                    {source === "all" ? "Todas as origens" : sourceLabel(source)}
                  </option>
                ))}
              </select>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por CNPJ, empresa, cidade ou telefone"
                className="panel-input"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visualização</p>
              <button
                type="button"
                onClick={() => setViewMode("lista")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  viewMode === "lista"
                    ? "border-teal-300 bg-teal-50 text-teal-800"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                Lista
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grade")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  viewMode === "grade"
                    ? "border-teal-300 bg-teal-50 text-teal-800"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                Grade
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  viewMode === "kanban"
                    ? "border-teal-300 bg-teal-50 text-teal-800"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                Kanban
              </button>
            </div>

            {viewMode === "kanban" && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Colunas visíveis no kanban
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibleKanbanStatuses([...STATUS_OPTIONS])}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Mostrar todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleKanbanStatuses(["novo", "contatado", "qualificado"])}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Funil inicial
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => {
                    const active = visibleKanbanStatuses.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setVisibleKanbanStatuses((current) =>
                            current.includes(status)
                              ? current.filter((item) => item !== status)
                              : [...current, status]
                          );
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          active
                            ? "border-teal-300 bg-teal-50 text-teal-800"
                            : "border-slate-300 bg-white text-slate-500"
                        }`}
                      >
                        {statusLabel(status)}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tamanho dos cards</p>
                  {[
                    { value: "compact", label: "Compacto" },
                    { value: "normal", label: "Normal" },
                    { value: "wide", label: "Amplo" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setKanbanDensity(item.value as typeof kanbanDensity)}
                      className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                        kanbanDensity === item.value
                          ? "border-teal-300 bg-teal-50 text-teal-800"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className={selectedLead ? "grid gap-4 xl:grid-cols-[2fr,1fr]" : "grid gap-4"}>
      <div className="panel-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">Nenhum lead encontrado.</div>
        ) : viewMode === "lista" ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Lead</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contato</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Prioridade</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Canal</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Próximo contato</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((lead) => {
                  const { first, extra } = inlineTagInfo(leadTags[lead.cnpj]);
                  return (
                  <tr key={lead.cnpj} className="align-top hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate font-semibold text-slate-900">{lead.razaoSocial || lead.nomeFantasia || "Lead"}</p>
                        {first && (
                          <span
                            key={first.id}
                            className="inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ borderColor: first.color || "#cbd5e1", color: first.color || "#475569" }}
                          >
                            {first.name}
                          </span>
                        )}
                        {extra > 0 && (
                          <span className="inline-flex rounded-full border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            +{extra}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {sourceLabel(lead.source)} | {lead.source === "cnpj" ? maskCnpj(lead.cnpj) : lead.externalId}
                      </p>
                      <p className="text-xs text-slate-500">{lead.municipio || "-"} / {lead.uf || "-"}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <p>{lead.email || "-"}</p>
                      <p className="font-medium text-slate-900">{lead.telefone || "-"}</p>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={lead.status}
                        onChange={async (e) => {
                          await updateLead(lead.cnpj, { status: e.target.value as LeadStatus });
                          await reloadLeads();
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
                          await reloadLeads();
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
                          await reloadLeads();
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
                          await reloadLeads();
                        }}
                        className="panel-input min-w-[150px]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedLeadKey(lead.cnpj)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Gerenciar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await removeLead(lead.cnpj);
                            await reloadLeads();
                          }}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        ) : viewMode === "grade" ? (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] divide-y divide-slate-200 text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Lead</th>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Prioridade</th>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Canal</th>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Próx. contato</th>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Contato</th>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((lead) => {
                  const { first, extra } = inlineTagInfo(leadTags[lead.cnpj]);
                  return (
                    <tr key={lead.cnpj} className="hover:bg-slate-50/70">
                      <td className="px-2 py-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="truncate text-[13px] font-semibold text-slate-900">{lead.razaoSocial || lead.nomeFantasia || "Lead"}</p>
                          {first && (
                            <span
                              className="inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{ borderColor: first.color || "#cbd5e1", color: first.color || "#475569" }}
                            >
                              {first.name}
                            </span>
                          )}
                          {extra > 0 && (
                            <span className="inline-flex rounded-full border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              +{extra}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{lead.municipio || "-"} / {lead.uf || "-"}</p>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={lead.status}
                          onChange={async (e) => {
                            await updateLead(lead.cnpj, { status: e.target.value as LeadStatus });
                            await reloadLeads();
                          }}
                          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{statusLabel(status)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={lead.prioridade}
                          onChange={async (e) => {
                            await updateLead(lead.cnpj, { prioridade: e.target.value as LeadPriority });
                            await reloadLeads();
                          }}
                          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                        >
                          {PRIORITY_OPTIONS.map((priority) => (
                            <option key={priority} value={priority}>{priorityLabel(priority)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={lead.canalPreferencial}
                          onChange={async (e) => {
                            await updateLead(lead.cnpj, { canalPreferencial: e.target.value as LeadChannel });
                            await reloadLeads();
                          }}
                          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                        >
                          {CHANNEL_OPTIONS.map((channel) => (
                            <option key={channel} value={channel}>{channelLabel(channel)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={lead.proximoContato}
                          onChange={async (e) => {
                            await updateLead(lead.cnpj, { proximoContato: e.target.value });
                            await reloadLeads();
                          }}
                          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                        />
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        <p className="text-xs">{lead.telefone || "-"}</p>
                        <p className="text-[11px] text-slate-500">{lead.email || "-"}</p>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedLeadKey(lead.cnpj)}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Abrir
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await removeLead(lead.cnpj);
                              await reloadLeads();
                            }}
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto p-3">
            <div
              className="grid gap-3"
              style={{
                minWidth:
                  kanbanDensity === "compact"
                    ? `${Math.max(780, visibleKanbanStatuses.length * 170)}px`
                    : kanbanDensity === "wide"
                      ? `${Math.max(1080, visibleKanbanStatuses.length * 280)}px`
                      : `${Math.max(940, visibleKanbanStatuses.length * 230)}px`,
                gridTemplateColumns: `repeat(${visibleKanbanStatuses.length || 1}, minmax(${kanbanDensity === "compact" ? 170 : kanbanDensity === "wide" ? 280 : 230}px, 1fr))`,
              }}
            >
              {kanbanByStatus.map((column) => (
                <section
                  key={column.status}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragTargetStatus(column.status);
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragTargetStatus(column.status);
                  }}
                  onDragLeave={() => {
                    setDragTargetStatus((current) => (current === column.status ? "" : current));
                  }}
                  onDrop={async (event) => {
                    event.preventDefault();
                    const leadKey = event.dataTransfer.getData("text/plain");
                    setDraggedLeadKey("");
                    setDragTargetStatus("");
                    if (!leadKey) return;
                    await moveLeadToStatus(leadKey, column.status);
                  }}
                  className={`rounded-xl border bg-white p-2 transition ${dragTargetStatus === column.status ? "border-teal-400 bg-teal-50/40 ring-2 ring-teal-200" : "border-slate-200"}`}
                >
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`crm-kpi-pill ${metricTone(column.status).bar}`} />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{statusLabel(column.status)}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {column.items.length}
                    </span>
                  </div>

                  <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
                    {column.items.map((lead) => (
                      <article
                        key={lead.cnpj}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", lead.cnpj);
                          setDraggedLeadKey(lead.cnpj);
                        }}
                        onDragEnd={() => {
                          setDraggedLeadKey("");
                          setDragTargetStatus("");
                        }}
                        className={`rounded-xl border bg-slate-50 p-2.5 shadow-sm transition ${draggedLeadKey === lead.cnpj ? "cursor-grabbing border-teal-400 opacity-70" : "cursor-grab border-slate-200"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-start gap-1.5">
                              <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                                {lead.razaoSocial || lead.nomeFantasia || "Lead"}
                              </p>
                              <button
                                type="button"
                                onClick={() => setSelectedLeadKey(lead.cnpj)}
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                title="Abrir detalhes do lead"
                                aria-label="Abrir detalhes do lead"
                              >
                                <Icon name="open" />
                              </button>
                            </div>
                            {(leadTags[lead.cnpj] || []).length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(leadTags[lead.cnpj] || []).map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="inline-flex rounded-full border bg-white px-1.5 py-0.5 text-[10px] font-semibold"
                                    style={{ borderColor: tag.color || "#cbd5e1", color: tag.color || "#475569" }}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              <Icon name="source" />
                              {lead.source === "cnpj" ? "CNPJ" : "Mapa"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <Icon name="location" />
                            <span className="truncate">{lead.municipio || "-"} / {lead.uf || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Icon name="contact" />
                            <span className="truncate">{lead.telefone || lead.email || "Sem contato"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Icon name="company" />
                            <span className="truncate">{lead.source === "cnpj" ? maskCnpj(lead.cnpj) : lead.externalId}</span>
                          </div>
                        </div>

                        <div className="mt-2 space-y-2">
                          <select
                            value={lead.status}
                            onChange={async (e) => {
                              await updateLead(lead.cnpj, { status: e.target.value as LeadStatus });
                              await reloadLeads();
                            }}
                            className="panel-input py-1 text-xs"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>{statusLabel(status)}</option>
                            ))}
                          </select>
                        </div>
                      </article>
                    ))}

                    {column.items.length === 0 && (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2 text-xs text-slate-500">
                        Sem leads nesta etapa.
                      </p>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedLead && (
        <aside className="panel-card p-4">
          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label-kicker">Lead selecionado</p>
                  <h3 className="font-display mt-1 text-lg font-semibold text-slate-900">{selectedLead.razaoSocial || selectedLead.nomeFantasia || "Lead"}</h3>
                  <p className="text-xs text-slate-500">{selectedLead.source === "cnpj" ? maskCnpj(selectedLead.cnpj) : selectedLead.externalId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLeadKey("")}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  X
                </button>
              </div>
            </div>

            <section className="space-y-2">

              <Link
                href={`/ai?lead=${encodeURIComponent(selectedLead.cnpj)}`}
                className="inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Ir para central
              </Link>
            </section>
          </div>
        </aside>
      )}
      </section>
      </div>
    </AuthGuard>
  );
}