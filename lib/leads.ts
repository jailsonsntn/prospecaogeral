import { CnpjData, normalizeCnpj, serializeValue } from "@/lib/cnpj";
import { getSession, getSupabaseConfig } from "@/lib/supabaseAuth";

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

interface SupabaseLeadRow {
  owner_id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  municipio: string;
  uf: string;
  status: LeadStatus;
  canal_preferencial: LeadChannel;
  prioridade: LeadPriority;
  proximo_contato: string | null;
  observacao: string;
  source_data: CnpjData;
  created_at?: string;
  updated_at?: string;
}

const STORAGE_KEY = "radar-cnpj-leads";
const LEADS_EVENT = "radar-leads-updated";
const SUPABASE_TABLE = "crm_leads";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitLeadsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LEADS_EVENT));
  }
}

function canUseSupabase(): boolean {
  const { url, publishableKey } = getSupabaseConfig();
  return Boolean(url && publishableKey && getSession()?.access_token);
}

function getCurrentOwnerId(): string {
  return getSession()?.user?.id || "";
}

function withOwnerFilter(path: string): string {
  const ownerId = getCurrentOwnerId();
  if (!ownerId) return path;
  return `${path}&owner_id=eq.${encodeURIComponent(ownerId)}`;
}

function readLocalLeads(): LeadItem[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map(normalizeLeadItem) as LeadItem[];
  } catch {
    return [];
  }
}

function writeLocalLeads(leads: LeadItem[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  emitLeadsUpdated();
}

function normalizeLeadItem(lead: Partial<LeadItem> & Pick<LeadItem, "cnpj">): LeadItem {
  const now = new Date().toISOString();
  return {
    cnpj: getLeadKey(lead.cnpj),
    razaoSocial: lead.razaoSocial || "",
    nomeFantasia: lead.nomeFantasia || "",
    email: lead.email || "",
    telefone: lead.telefone || "",
    municipio: lead.municipio || "",
    uf: lead.uf || "",
    status: lead.status || "novo",
    canalPreferencial: lead.canalPreferencial || "email",
    prioridade: lead.prioridade || "media",
    proximoContato: lead.proximoContato || "",
    observacao: lead.observacao || "",
    createdAt: lead.createdAt || now,
    updatedAt: lead.updatedAt || now,
    sourceData: lead.sourceData || {},
  };
}

function fromSupabaseRow(row: SupabaseLeadRow): LeadItem {
  return normalizeLeadItem({
    cnpj: row.cnpj,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    email: row.email,
    telefone: row.telefone,
    municipio: row.municipio,
    uf: row.uf,
    status: row.status,
    canalPreferencial: row.canal_preferencial,
    prioridade: row.prioridade,
    proximoContato: row.proximo_contato || "",
    observacao: row.observacao,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceData: row.source_data,
  });
}

function toSupabaseRow(lead: LeadItem): SupabaseLeadRow {
  const ownerId = getCurrentOwnerId();
  return {
    owner_id: ownerId,
    cnpj: getLeadKey(lead.cnpj),
    razao_social: lead.razaoSocial,
    nome_fantasia: lead.nomeFantasia,
    email: lead.email,
    telefone: lead.telefone,
    municipio: lead.municipio,
    uf: lead.uf,
    status: lead.status,
    canal_preferencial: lead.canalPreferencial,
    prioridade: lead.prioridade,
    proximo_contato: lead.proximoContato || null,
    observacao: lead.observacao,
    source_data: lead.sourceData || {},
  };
}

async function supabaseFetch(path: string, init?: RequestInit): Promise<Response> {
  const { url, publishableKey } = getSupabaseConfig();
  const session = getSession();

  const headers: Record<string, string> = {
    apikey: publishableKey,
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (!headers["Content-Type"] && init?.body) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${url}/rest/v1/${path}`, {
    cache: "no-store",
    ...init,
    headers,
  });
}

async function loadFromSupabase(): Promise<LeadItem[]> {
  if (!canUseSupabase()) return [];

  const ownerId = getCurrentOwnerId();
  if (!ownerId) return [];

  const resp = await supabaseFetch(
    withOwnerFilter(
      `${SUPABASE_TABLE}?select=owner_id,cnpj,razao_social,nome_fantasia,email,telefone,municipio,uf,status,canal_preferencial,prioridade,proximo_contato,observacao,source_data,created_at,updated_at&order=updated_at.desc`
    )
  );

  if (!resp.ok) return [];

  const data = (await resp.json()) as SupabaseLeadRow[];
  return Array.isArray(data) ? data.map(fromSupabaseRow) : [];
}

async function insertSupabaseLead(lead: LeadItem): Promise<LeadItem | null> {
  if (!canUseSupabase()) return null;

  const resp = await supabaseFetch(SUPABASE_TABLE, {
    method: "POST",
    headers: {
      Prefer: "return=representation",
      "Content-Type": "application/json",
    },
    body: JSON.stringify([toSupabaseRow(lead)]),
  });

  if (!resp.ok) return null;

  const data = (await resp.json()) as SupabaseLeadRow[];
  return data[0] ? fromSupabaseRow(data[0]) : lead;
}

async function patchSupabaseLead(cnpj: string, updates: Partial<LeadItem>): Promise<void> {
  if (!canUseSupabase()) return;

  const payload: Record<string, unknown> = {};
  if (updates.status) payload.status = updates.status;
  if (updates.canalPreferencial) payload.canal_preferencial = updates.canalPreferencial;
  if (updates.prioridade) payload.prioridade = updates.prioridade;
  if (updates.proximoContato !== undefined) payload.proximo_contato = updates.proximoContato || null;
  if (updates.observacao !== undefined) payload.observacao = updates.observacao;
  if (updates.razaoSocial !== undefined) payload.razao_social = updates.razaoSocial;
  if (updates.nomeFantasia !== undefined) payload.nome_fantasia = updates.nomeFantasia;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.telefone !== undefined) payload.telefone = updates.telefone;
  if (updates.municipio !== undefined) payload.municipio = updates.municipio;
  if (updates.uf !== undefined) payload.uf = updates.uf;
  if (updates.sourceData !== undefined) payload.source_data = updates.sourceData;

  if (Object.keys(payload).length === 0) return;

  const ownerId = getCurrentOwnerId();
  if (!ownerId) return;

  await supabaseFetch(`${SUPABASE_TABLE}?owner_id=eq.${encodeURIComponent(ownerId)}&cnpj=eq.${encodeURIComponent(getLeadKey(cnpj))}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function deleteSupabaseLead(cnpj: string): Promise<void> {
  if (!canUseSupabase()) return;

  const ownerId = getCurrentOwnerId();
  if (!ownerId) return;

  await supabaseFetch(`${SUPABASE_TABLE}?owner_id=eq.${encodeURIComponent(ownerId)}&cnpj=eq.${encodeURIComponent(getLeadKey(cnpj))}`, {
    method: "DELETE",
  });
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
  return readLocalLeads();
}

export async function fetchLeads(): Promise<LeadItem[]> {
  const leads = await loadFromSupabase();
  if (leads.length > 0 || canUseSupabase()) return leads;
  return readLocalLeads();
}

export async function upsertLeadFromRow(row: CnpjData): Promise<LeadItem> {
  const leads = await fetchLeads();
  const cnpj = getLeadKeyFromRow(row);
  const now = new Date().toISOString();

  const existing = leads.find((lead) => lead.cnpj === cnpj);

  const nextLead: LeadItem = normalizeLeadItem({
    cnpj,
    razaoSocial: serializeValue(row.razao_social),
    nomeFantasia: serializeValue(row.nome_fantasia),
    email: serializeValue(row.email),
    telefone: serializeValue(row.ddd_telefone_1) || serializeValue(row.ddd_telefone_2),
    municipio: serializeValue(row.municipio),
    uf: serializeValue(row.uf),
    status: existing?.status || "novo",
    canalPreferencial: existing?.canalPreferencial || "email",
    prioridade: existing?.prioridade || "media",
    proximoContato: existing?.proximoContato || "",
    observacao: existing?.observacao || "",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    sourceData: row,
  });

  const persisted = existing ? null : await insertSupabaseLead(nextLead);
  if (existing) {
    await patchSupabaseLead(cnpj, nextLead);
  }
  const finalLead = persisted || nextLead;
  writeLocalLeads([finalLead, ...leads.filter((lead) => lead.cnpj !== cnpj)]);
  return finalLead;
}

export async function removeLead(cnpj: string): Promise<void> {
  const key = getLeadKey(cnpj);
  const leads = await fetchLeads();
  await deleteSupabaseLead(key);
  writeLocalLeads(leads.filter((lead) => lead.cnpj !== key));
}

export async function updateLead(
  cnpj: string,
  updates: Partial<Pick<LeadItem, "status" | "canalPreferencial" | "prioridade" | "proximoContato" | "observacao">>
): Promise<void> {
  const key = getLeadKey(cnpj);
  const leads = await fetchLeads();
  const current = leads.find((lead) => lead.cnpj === key);
  if (!current) return;

  const nextLead: LeadItem = normalizeLeadItem({
    ...current,
    ...updates,
    cnpj: key,
    updatedAt: new Date().toISOString(),
  });

  await patchSupabaseLead(key, nextLead);
  writeLocalLeads(leads.map((lead) => (lead.cnpj === key ? nextLead : lead)));
}

export async function isLead(cnpj: string): Promise<boolean> {
  const key = getLeadKey(cnpj);
  const leads = await fetchLeads();
  return leads.some((lead) => lead.cnpj === key);
}