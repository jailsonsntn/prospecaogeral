import { canUseSupabase, getCurrentOwnerId, supabaseFetch } from "@/lib/supabaseRest";

export interface CrmTag {
  id: string;
  name: string;
  color: string | null;
}

export interface LeadNote {
  id: string;
  note: string;
  created_at: string;
}

export interface LeadTask {
  id: string;
  title: string;
  description: string | null;
  status: "aberta" | "em_andamento" | "concluida" | "cancelada";
  due_at: string | null;
  created_at: string;
}

export interface TextTemplate {
  id: string;
  title: string;
  channel: string | null;
  content: string;
}

export async function addAiSuggestion(
  leadId: string,
  suggestionType: string,
  inputData: Record<string, unknown>,
  outputText: string
): Promise<void> {
  if (!canUseSupabase() || !leadId || !suggestionType || !outputText.trim()) return;
  const ownerId = getCurrentOwnerId();
  if (!ownerId) return;

  await supabaseFetch("ai_suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      {
        lead_id: leadId,
        owner_id: ownerId,
        suggestion_type: suggestionType,
        input_data: inputData,
        output_data: { text: outputText },
      },
    ]),
  });
}

export async function fetchTags(): Promise<CrmTag[]> {
  if (!canUseSupabase()) return [];
  const ownerId = getCurrentOwnerId();
  if (!ownerId) return [];

  const resp = await supabaseFetch(`tags?select=id,name,color&owner_id=eq.${encodeURIComponent(ownerId)}&order=name.asc`);
  if (!resp.ok) return [];
  const data = (await resp.json()) as CrmTag[];
  return Array.isArray(data) ? data : [];
}

export async function createTag(name: string, color: string): Promise<CrmTag | null> {
  if (!canUseSupabase()) return null;
  const ownerId = getCurrentOwnerId();
  if (!ownerId) return null;

  const resp = await supabaseFetch("tags", {
    method: "POST",
    headers: { Prefer: "return=representation", "Content-Type": "application/json" },
    body: JSON.stringify([{ owner_id: ownerId, name, color }]),
  });

  if (!resp.ok) return null;
  const rows = (await resp.json()) as CrmTag[];
  return rows[0] || null;
}

export async function fetchLeadTagIds(leadId: string): Promise<string[]> {
  if (!canUseSupabase() || !leadId) return [];
  const resp = await supabaseFetch(`lead_tags?select=tag_id&lead_id=eq.${encodeURIComponent(leadId)}`);
  if (!resp.ok) return [];
  const rows = (await resp.json()) as Array<{ tag_id: string }>;
  return rows.map((row) => row.tag_id);
}

export async function assignTagToLead(leadId: string, tagId: string): Promise<void> {
  if (!canUseSupabase() || !leadId || !tagId) return;
  await supabaseFetch("lead_tags", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates", "Content-Type": "application/json" },
    body: JSON.stringify([{ lead_id: leadId, tag_id: tagId }]),
  });
}

export async function unassignTagFromLead(leadId: string, tagId: string): Promise<void> {
  if (!canUseSupabase() || !leadId || !tagId) return;
  await supabaseFetch(`lead_tags?lead_id=eq.${encodeURIComponent(leadId)}&tag_id=eq.${encodeURIComponent(tagId)}`, {
    method: "DELETE",
  });
}

export async function fetchLeadNotes(leadId: string): Promise<LeadNote[]> {
  if (!canUseSupabase() || !leadId) return [];
  const resp = await supabaseFetch(`lead_notes?select=id,note,created_at&lead_id=eq.${encodeURIComponent(leadId)}&order=created_at.desc`);
  if (!resp.ok) return [];
  const rows = (await resp.json()) as LeadNote[];
  return Array.isArray(rows) ? rows : [];
}

export async function addLeadNote(leadId: string, note: string): Promise<void> {
  if (!canUseSupabase() || !leadId || !note.trim()) return;
  const ownerId = getCurrentOwnerId();
  if (!ownerId) return;

  await supabaseFetch("lead_notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ lead_id: leadId, author_id: ownerId, note }]),
  });
}

export async function fetchLeadTasks(leadId: string): Promise<LeadTask[]> {
  if (!canUseSupabase() || !leadId) return [];
  const resp = await supabaseFetch(`tasks?select=id,title,description,status,due_at,created_at&lead_id=eq.${encodeURIComponent(leadId)}&order=created_at.desc`);
  if (!resp.ok) return [];
  const rows = (await resp.json()) as LeadTask[];
  return Array.isArray(rows) ? rows : [];
}

export async function addLeadTask(leadId: string, title: string, dueAt?: string): Promise<void> {
  if (!canUseSupabase() || !leadId || !title.trim()) return;
  const ownerId = getCurrentOwnerId();
  if (!ownerId) return;

  await supabaseFetch("tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      {
        lead_id: leadId,
        owner_id: ownerId,
        title: title.trim(),
        due_at: dueAt || null,
      },
    ]),
  });
}

export async function updateTaskStatus(taskId: string, status: LeadTask["status"]): Promise<void> {
  if (!canUseSupabase() || !taskId) return;

  await supabaseFetch(`tasks?id=eq.${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function fetchTemplates(): Promise<TextTemplate[]> {
  if (!canUseSupabase()) return [];
  const ownerId = getCurrentOwnerId();
  if (!ownerId) return [];

  const resp = await supabaseFetch(`text_templates?select=id,title,channel,content&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.desc`);
  if (!resp.ok) return [];
  const rows = (await resp.json()) as TextTemplate[];
  return Array.isArray(rows) ? rows : [];
}

export async function addTemplate(title: string, channel: string, content: string): Promise<void> {
  if (!canUseSupabase() || !title.trim() || !content.trim()) return;
  const ownerId = getCurrentOwnerId();
  if (!ownerId) return;

  await supabaseFetch("text_templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      {
        owner_id: ownerId,
        title: title.trim(),
        channel: channel.trim() || null,
        content: content.trim(),
      },
    ]),
  });
}
