import { CnpjData, normalizeCnpj, serializeValue } from "@/lib/cnpj";

export type LeadStatus = "novo" | "contato" | "qualificado" | "proposta" | "fechado" | "perdido";
export type LeadChannel = "email" | "whatsapp" | "telefone" | "outro";
export type LeadPriority = "baixa" | "media" | "alta";

export interface LeadItem {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  email: string;
  telefone: string;
  municipio: string;
  uf: string;
  status: LeadStatus;
  canalPreferencial: LeadChannel;
  prioridade: LeadPriority;
  proximoContato: string;
  observacao: string;
  createdAt: string;
  updatedAt: string;
  sourceData: CnpjData;
}

const STORAGE_KEY = "radar-cnpj-leads";
const LEADS_EVENT = "radar-leads-updated";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitLeadsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LEADS_EVENT));
  }
}

export function getLeadsEventName(): string {
  return LEADS_EVENT;
}

export function getLeadKeyFromRow(row: CnpjData): string {
  return normalizeCnpj(serializeValue(row.cnpj));
}

export function getLeadKey(cnpj: string): string {
  return normalizeCnpj(cnpj);
}

export function getLeads(): LeadItem[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map((lead) => ({
      ...lead,
      prioridade: (lead.prioridade as LeadPriority) || "media",
      proximoContato: String(lead.proximoContato || ""),
    })) as LeadItem[];
  } catch {
    return [];
  }
}

function saveLeads(leads: LeadItem[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  emitLeadsUpdated();
}

export function upsertLeadFromRow(row: CnpjData): LeadItem {
  const leads = getLeads();
  const cnpj = getLeadKeyFromRow(row);
  const now = new Date().toISOString();

  const existing = leads.find((lead) => lead.cnpj === cnpj);

  if (existing) {
    const updated: LeadItem = {
      ...existing,
      razaoSocial: serializeValue(row.razao_social),
      nomeFantasia: serializeValue(row.nome_fantasia),
      email: serializeValue(row.email),
      telefone: serializeValue(row.ddd_telefone_1) || serializeValue(row.ddd_telefone_2),
      municipio: serializeValue(row.municipio),
      uf: serializeValue(row.uf),
      sourceData: row,
      updatedAt: now,
    };

    saveLeads(leads.map((lead) => (lead.cnpj === cnpj ? updated : lead)));
    return updated;
  }

  const created: LeadItem = {
    cnpj,
    razaoSocial: serializeValue(row.razao_social),
    nomeFantasia: serializeValue(row.nome_fantasia),
    email: serializeValue(row.email),
    telefone: serializeValue(row.ddd_telefone_1) || serializeValue(row.ddd_telefone_2),
    municipio: serializeValue(row.municipio),
    uf: serializeValue(row.uf),
    status: "novo",
    canalPreferencial: "email",
    prioridade: "media",
    proximoContato: "",
    observacao: "",
    createdAt: now,
    updatedAt: now,
    sourceData: row,
  };

  saveLeads([created, ...leads]);
  return created;
}

export function removeLead(cnpj: string): void {
  const key = getLeadKey(cnpj);
  const leads = getLeads();
  saveLeads(leads.filter((lead) => lead.cnpj !== key));
}

export function updateLead(
  cnpj: string,
  updates: Partial<Pick<LeadItem, "status" | "canalPreferencial" | "prioridade" | "proximoContato" | "observacao">>
): void {
  const key = getLeadKey(cnpj);
  const leads = getLeads();
  const now = new Date().toISOString();

  saveLeads(
    leads.map((lead) =>
      lead.cnpj === key
        ? {
            ...lead,
            ...updates,
            updatedAt: now,
          }
        : lead
    )
  );
}

export function isLead(cnpj: string): boolean {
  const key = getLeadKey(cnpj);
  return getLeads().some((lead) => lead.cnpj === key);
}