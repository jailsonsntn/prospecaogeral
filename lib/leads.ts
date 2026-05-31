import { CnpjData, normalizeCnpj, serializeValue } from "@/lib/cnpj";
import { canUseSupabase, getCurrentOwnerId, supabaseFetch } from "@/lib/supabaseRest";

export type LeadStatus = "novo" | "contatado" | "qualificado" | "proposta" | "fechado" | "perdido";
export type LeadChannel = "email" | "whatsapp" | "telefone" | "outro";
export type LeadPriority = "baixa" | "media" | "alta";
export type LeadSource = "cnpj" | "maps";

export interface LeadItem {
  id?: string;
  source: LeadSource;
  externalId: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  email: string;
  telefone: string;
  website: string;
  endereco: string;
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

export interface MapLeadInput {
  placeId: string;
  name: string;
  phone?: string;
  address?: string;
  website?: string;
}

interface SupabaseLeadRow {
  id: string;
  owner_id: string;
  source: LeadSource;
  external_id: string;
  business_name: string;
  cnpj: string | null;
  place_id: string | null;
  phone: string | null;
  email: string;
  website: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  last_contact_at: string | null;
  next_action_at: string | null;
  created_at?: string;
  updated_at?: string;
}

const STORAGE_KEY = "radar-cnpj-leads";
const LEADS_EVENT = "radar-leads-updated";
const SUPABASE_TABLE = "leads";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitLeadsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LEADS_EVENT));
  }
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
    id: lead.id,
    source: lead.source || "cnpj",
    externalId: lead.externalId || getLeadKey(lead.cnpj),
    cnpj: getLeadKey(lead.cnpj),
    razaoSocial: lead.razaoSocial || "",
    nomeFantasia: lead.nomeFantasia || "",
    email: lead.email || "",
    telefone: lead.telefone || "",
    website: lead.website || "",
    endereco: lead.endereco || "",
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
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    cnpj: row.cnpj || `MAP-${row.place_id || row.external_id}`,
    razaoSocial: row.business_name,
    nomeFantasia: row.business_name,
    email: row.email,
    telefone: row.phone || "",
    website: row.website || "",
    endereco: row.address || "",
    municipio: row.city || "",
    uf: row.state || "",
    status: row.status,
    canalPreferencial: "email",
    prioridade: row.priority,
    proximoContato: row.next_action_at || "",
    observacao: "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceData: {},
  });
}

function toSupabaseRow(lead: LeadItem): SupabaseLeadRow {
  const ownerId = getCurrentOwnerId();
  return {
    id: lead.id || "",
    owner_id: ownerId,
    source: lead.source,
    external_id: lead.externalId,
    business_name: lead.razaoSocial || lead.nomeFantasia,
    cnpj: lead.source === "cnpj" ? getLeadKey(lead.cnpj) : null,
    place_id: lead.source === "maps" ? lead.externalId : null,
    phone: lead.telefone,
    email: lead.email,
    website: lead.website || null,
    city: lead.municipio,
    state: lead.uf,
    address: lead.endereco || null,
    status: lead.status,
    priority: lead.prioridade,
    last_contact_at: null,
    next_action_at: lead.proximoContato || null,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
  };
}

async function loadFromSupabase(): Promise<LeadItem[]> {
  if (!canUseSupabase()) return [];

  const ownerId = getCurrentOwnerId();
  if (!ownerId) return [];

  const resp = await supabaseFetch(
    withOwnerFilter(
      `${SUPABASE_TABLE}?select=id,owner_id,source,external_id,business_name,cnpj,place_id,phone,email,website,city,state,address,status,priority,last_contact_at,next_action_at,created_at,updated_at&order=updated_at.desc`
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
    body: JSON.stringify([
      {
        owner_id: getCurrentOwnerId(),
        source: lead.source,
        external_id: lead.externalId,
        business_name: lead.razaoSocial || lead.nomeFantasia,
        cnpj: lead.source === "cnpj" ? getLeadKey(lead.cnpj) : null,
        place_id: lead.source === "maps" ? lead.externalId : null,
        phone: lead.telefone || null,
        email: lead.email || "",
        website: lead.website || null,
        city: lead.municipio || null,
        state: lead.uf || null,
        address: lead.endereco || null,
        status: lead.status,
        priority: lead.prioridade,
        next_action_at: lead.proximoContato || null,
      },
    ]),
  });

  if (!resp.ok) return null;

  const data = (await resp.json()) as SupabaseLeadRow[];
  return data[0] ? fromSupabaseRow(data[0]) : lead;
}

async function patchSupabaseLead(cnpj: string, updates: Partial<LeadItem>): Promise<void> {
  if (!canUseSupabase()) return;

  const payload: Record<string, unknown> = {};
  if (updates.status) payload.status = updates.status;
  if (updates.prioridade) payload.priority = updates.prioridade;
  if (updates.proximoContato !== undefined) payload.next_action_at = updates.proximoContato || null;
  if (updates.razaoSocial !== undefined) payload.business_name = updates.razaoSocial;
  if (updates.nomeFantasia !== undefined && !updates.razaoSocial) payload.business_name = updates.nomeFantasia;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.telefone !== undefined) payload.phone = updates.telefone;
  if (updates.municipio !== undefined) payload.city = updates.municipio;
  if (updates.uf !== undefined) payload.state = updates.uf;
  if (updates.website !== undefined) payload.website = updates.website || null;
  if (updates.endereco !== undefined) payload.address = updates.endereco || null;

  if (Object.keys(payload).length === 0) return;

  const ownerId = getCurrentOwnerId();
  if (!ownerId) return;

  const lead = (await fetchLeads()).find((item) => item.cnpj === getLeadKey(cnpj));
  const externalId = lead?.externalId || getLeadKey(cnpj);
  const source = lead?.source || "cnpj";

  await supabaseFetch(
    `${SUPABASE_TABLE}?owner_id=eq.${encodeURIComponent(ownerId)}&source=eq.${encodeURIComponent(source)}&external_id=eq.${encodeURIComponent(externalId)}`,
    {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    }
  );
}

async function deleteSupabaseLead(cnpj: string): Promise<void> {
  if (!canUseSupabase()) return;

  const ownerId = getCurrentOwnerId();
  if (!ownerId) return;

  const lead = (await fetchLeads()).find((item) => item.cnpj === getLeadKey(cnpj));
  if (!lead) return;

  await supabaseFetch(
    `${SUPABASE_TABLE}?owner_id=eq.${encodeURIComponent(ownerId)}&source=eq.${encodeURIComponent(lead.source)}&external_id=eq.${encodeURIComponent(lead.externalId)}`,
    {
      method: "DELETE",
    }
  );
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
    id: existing?.id,
    source: "cnpj",
    externalId: cnpj,
    cnpj,
    razaoSocial: serializeValue(row.razao_social),
    nomeFantasia: serializeValue(row.nome_fantasia),
    email: serializeValue(row.email),
    telefone: serializeValue(row.ddd_telefone_1) || serializeValue(row.ddd_telefone_2),
    website: serializeValue(row.website),
    endereco: [
      serializeValue(row.logradouro),
      serializeValue(row.numero),
      serializeValue(row.bairro),
    ]
      .filter(Boolean)
      .join(", "),
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

export async function upsertLeadFromMapResult(input: MapLeadInput): Promise<LeadItem> {
  const leads = await fetchLeads();
  const key = getLeadKey(`MAP-${input.placeId}`);
  const existing = leads.find((lead) => lead.cnpj === key);
  const now = new Date().toISOString();

  const lead = normalizeLeadItem({
    id: existing?.id,
    source: "maps",
    externalId: input.placeId,
    cnpj: key,
    razaoSocial: input.name,
    nomeFantasia: input.name,
    telefone: input.phone || "",
    email: "",
    website: input.website || "",
    endereco: input.address || "",
    municipio: existing?.municipio || "",
    uf: existing?.uf || "",
    status: existing?.status || "novo",
    canalPreferencial: existing?.canalPreferencial || "telefone",
    prioridade: existing?.prioridade || "media",
    proximoContato: existing?.proximoContato || "",
    observacao: existing?.observacao || "",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    sourceData: {
      origem: "maps",
      place_id: input.placeId,
      google_maps_name: input.name,
    },
  });

  const persisted = existing ? null : await insertSupabaseLead(lead);
  if (existing) {
    await patchSupabaseLead(lead.cnpj, lead);
  }
  const finalLead = persisted || lead;
  writeLocalLeads([finalLead, ...leads.filter((item) => item.cnpj !== lead.cnpj)]);
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

export async function upsertLeadByCurrentData(lead: LeadItem): Promise<void> {
  const key = getLeadKey(lead.cnpj);
  const currentLeads = await fetchLeads();
  const existing = currentLeads.find((item) => item.cnpj === key);

  const nextLead = normalizeLeadItem({
    ...lead,
    id: existing?.id || lead.id,
    cnpj: key,
    updatedAt: new Date().toISOString(),
  });

  if (existing) {
    await patchSupabaseLead(key, nextLead);
  } else {
    await insertSupabaseLead(nextLead);
  }

  writeLocalLeads([nextLead, ...currentLeads.filter((item) => item.cnpj !== key)]);
}

export async function isLead(cnpj: string): Promise<boolean> {
  const key = getLeadKey(cnpj);
  const leads = await fetchLeads();
  return leads.some((lead) => lead.cnpj === key);
}