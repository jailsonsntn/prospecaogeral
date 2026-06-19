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
  updated_at?: string;
}

export interface LeadTask {
  id: string;
  title: string;
  description: string | null;
  status: "aberta" | "em_andamento" | "concluida" | "cancelada";
  due_at: string | null;
  created_at: string;
  updated_at?: string;
}

export interface TextTemplate {
  id: string;
  title: string;
  channel: string | null;
  content: string;
}

const LOCAL_TAGS_KEY = "radar-local-tags";
const LOCAL_LEAD_TAGS_KEY = "radar-local-lead-tags";
const LOCAL_TAGS_MODE_KEY = "radar-local-tags-mode";
const LOCAL_NOTES_KEY = "radar-local-notes";
const LOCAL_TASKS_KEY = "radar-local-tasks";
const LOCAL_NOTES_MODE_KEY = "radar-local-notes-mode";
const LOCAL_TASKS_MODE_KEY = "radar-local-tasks-mode";

interface LocalLeadTagMap {
  [leadId: string]: string[];
}

interface LocalLeadNotesMap {
  [leadId: string]: LeadNote[];
}

interface LocalLeadTasksMap {
  [leadId: string]: LeadTask[];
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function ownerScopedKey(baseKey: string): string {
  const ownerId = getCurrentOwnerId() || "anonymous";
  return `${baseKey}:${ownerId}`;
}

function readLocalTagsMode(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(ownerScopedKey(LOCAL_TAGS_MODE_KEY)) === "1";
}

function enableLocalTagsMode(): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ownerScopedKey(LOCAL_TAGS_MODE_KEY), "1");
}

function readLocalNotesMode(): boolean {
  if (!canUseStorage()) return false;
  return readLocalTagsMode() || window.localStorage.getItem(ownerScopedKey(LOCAL_NOTES_MODE_KEY)) === "1";
}

function enableLocalNotesMode(): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ownerScopedKey(LOCAL_NOTES_MODE_KEY), "1");
}

function readLocalTasksMode(): boolean {
  if (!canUseStorage()) return false;
  return readLocalTagsMode() || window.localStorage.getItem(ownerScopedKey(LOCAL_TASKS_MODE_KEY)) === "1";
}

function enableLocalTasksMode(): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ownerScopedKey(LOCAL_TASKS_MODE_KEY), "1");
}

function readLocalTags(): CrmTag[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(ownerScopedKey(LOCAL_TAGS_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CrmTag[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalTags(tags: CrmTag[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ownerScopedKey(LOCAL_TAGS_KEY), JSON.stringify(tags));
}

function readLocalLeadTagMap(): LocalLeadTagMap {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(ownerScopedKey(LOCAL_LEAD_TAGS_KEY));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LocalLeadTagMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalLeadTagMap(map: LocalLeadTagMap): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ownerScopedKey(LOCAL_LEAD_TAGS_KEY), JSON.stringify(map));
}

function readLocalLeadNotesMap(): LocalLeadNotesMap {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(ownerScopedKey(LOCAL_NOTES_KEY));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LocalLeadNotesMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalLeadNotesMap(map: LocalLeadNotesMap): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ownerScopedKey(LOCAL_NOTES_KEY), JSON.stringify(map));
}

function readLocalLeadTasksMap(): LocalLeadTasksMap {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(ownerScopedKey(LOCAL_TASKS_KEY));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LocalLeadTasksMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalLeadTasksMap(map: LocalLeadTasksMap): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ownerScopedKey(LOCAL_TASKS_KEY), JSON.stringify(map));
}

function mergeUniqueById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const merged = [...primary];
  for (const item of secondary) {
    if (!merged.some((current) => current.id === item.id)) {
      merged.push(item);
    }
  }
  return merged;
}

function updateNoteInLocalStorage(noteId: string, updater: (note: LeadNote) => LeadNote | null): boolean {
  const map = readLocalLeadNotesMap();
  let changed = false;
  const next: LocalLeadNotesMap = {};

  for (const [leadId, notes] of Object.entries(map)) {
    const updatedNotes: LeadNote[] = [];
    for (const note of notes) {
      if (note.id !== noteId) {
        updatedNotes.push(note);
        continue;
      }
      changed = true;
      const updated = updater(note);
      if (updated) updatedNotes.push(updated);
    }
    next[leadId] = updatedNotes;
  }

  if (changed) writeLocalLeadNotesMap(next);
  return changed;
}

function updateTaskInLocalStorage(taskId: string, updater: (task: LeadTask) => LeadTask | null): boolean {
  const map = readLocalLeadTasksMap();
  let changed = false;
  const next: LocalLeadTasksMap = {};

  for (const [leadId, tasks] of Object.entries(map)) {
    const updatedTasks: LeadTask[] = [];
    for (const task of tasks) {
      if (task.id !== taskId) {
        updatedTasks.push(task);
        continue;
      }
      changed = true;
      const updated = updater(task);
      if (updated) updatedTasks.push(updated);
    }
    next[leadId] = updatedTasks;
  }

  if (changed) writeLocalLeadTasksMap(next);
  return changed;
}

async function throwIfResponseFailed(resp: Response, fallbackMessage: string): Promise<void> {
  if (resp.ok) return;

  let details = "";
  try {
    const body = await resp.json();
    details = body?.message || body?.error || JSON.stringify(body);
  } catch {
    details = await resp.text();
  }

  throw new Error(details || fallbackMessage);
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
  const localTags = readLocalTags();
  if (!canUseSupabase() || readLocalTagsMode()) return localTags;
  const ownerId = getCurrentOwnerId();
  if (!ownerId) return localTags;

  const resp = await supabaseFetch(`tags?select=id,name,color&owner_id=eq.${encodeURIComponent(ownerId)}&order=name.asc`);
  if (!resp.ok) {
    if (resp.status === 403) enableLocalTagsMode();
    return localTags;
  }

  const remoteTags = (await resp.json()) as CrmTag[];
  if (!Array.isArray(remoteTags)) return localTags;

  const merged = [...remoteTags];
  for (const localTag of localTags) {
    const exists = merged.some((remoteTag) => remoteTag.id === localTag.id || remoteTag.name.toLowerCase() === localTag.name.toLowerCase());
    if (!exists) merged.unshift(localTag);
  }
  return merged;
}

export async function createTag(name: string, color: string): Promise<CrmTag | null> {
  if (!canUseSupabase() || readLocalTagsMode()) {
    const localTag: CrmTag = {
      id: `local-${Date.now()}`,
      name,
      color,
    };
    writeLocalTags([localTag, ...readLocalTags().filter((tag) => tag.name.toLowerCase() !== name.toLowerCase())]);
    return localTag;
  }
  const ownerId = getCurrentOwnerId();
  if (!ownerId) throw new Error("Sessão inválida para criar tag.");

  const resp = await supabaseFetch("tags", {
    method: "POST",
    headers: { Prefer: "return=representation", "Content-Type": "application/json" },
    body: JSON.stringify([{ owner_id: ownerId, name, color }]),
  });

  if (resp.status === 403) {
    enableLocalTagsMode();
    const localTag: CrmTag = {
      id: `local-${Date.now()}`,
      name,
      color,
    };
    writeLocalTags([localTag, ...readLocalTags().filter((tag) => tag.name.toLowerCase() !== name.toLowerCase())]);
    return localTag;
  }

  await throwIfResponseFailed(resp, "Falha ao criar tag.");
  const rows = (await resp.json()) as CrmTag[];
  return rows[0] || null;
}

export async function fetchLeadTagIds(leadId: string): Promise<string[]> {
  if (!leadId) return [];
  const localLeadTagIds = readLocalLeadTagMap()[leadId] || [];
  if (!canUseSupabase() || readLocalTagsMode()) {
    return localLeadTagIds;
  }

  const resp = await supabaseFetch(`lead_tags?select=tag_id&lead_id=eq.${encodeURIComponent(leadId)}`);
  if (!resp.ok) {
    if (resp.status === 403) enableLocalTagsMode();
    return localLeadTagIds;
  }

  const rows = (await resp.json()) as Array<{ tag_id: string }>;
  const remoteLeadTagIds = rows.map((row) => row.tag_id);
  const merged = new Set([...remoteLeadTagIds, ...localLeadTagIds]);
  return Array.from(merged);
}

export async function assignTagToLead(leadId: string, tagId: string): Promise<void> {
  if (!leadId || !tagId) return;
  const useLocalOnly = !canUseSupabase() || readLocalTagsMode() || tagId.startsWith("local-");
  if (useLocalOnly) {
    const map = readLocalLeadTagMap();
    const current = new Set(map[leadId] || []);
    current.add(tagId);
    map[leadId] = Array.from(current);
    writeLocalLeadTagMap(map);
    return;
  }
  const resp = await supabaseFetch("lead_tags", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates", "Content-Type": "application/json" },
    body: JSON.stringify([{ lead_id: leadId, tag_id: tagId }]),
  });
  if (resp.status === 403) {
    enableLocalTagsMode();
    const map = readLocalLeadTagMap();
    const current = new Set(map[leadId] || []);
    current.add(tagId);
    map[leadId] = Array.from(current);
    writeLocalLeadTagMap(map);
    return;
  }
  await throwIfResponseFailed(resp, "Falha ao vincular tag ao lead.");
}

export async function unassignTagFromLead(leadId: string, tagId: string): Promise<void> {
  if (!leadId || !tagId) return;
  const useLocalOnly = !canUseSupabase() || readLocalTagsMode() || tagId.startsWith("local-");
  if (useLocalOnly) {
    const map = readLocalLeadTagMap();
    map[leadId] = (map[leadId] || []).filter((currentTagId) => currentTagId !== tagId);
    writeLocalLeadTagMap(map);
    return;
  }
  const resp = await supabaseFetch(`lead_tags?lead_id=eq.${encodeURIComponent(leadId)}&tag_id=eq.${encodeURIComponent(tagId)}`, {
    method: "DELETE",
  });
  if (resp.status === 403) {
    enableLocalTagsMode();
    const map = readLocalLeadTagMap();
    map[leadId] = (map[leadId] || []).filter((currentTagId) => currentTagId !== tagId);
    writeLocalLeadTagMap(map);
    return;
  }
  await throwIfResponseFailed(resp, "Falha ao remover tag do lead.");
}

export async function updateTag(tagId: string, name: string, color: string): Promise<void> {
  if (!tagId || !name.trim()) return;

  const updateLocal = () => {
    const next = readLocalTags().map((tag) =>
      tag.id === tagId ? { ...tag, name: name.trim(), color } : tag
    );
    writeLocalTags(next);
  };

  if (!canUseSupabase() || readLocalTagsMode() || tagId.startsWith("local-")) {
    updateLocal();
    return;
  }

  const resp = await supabaseFetch(`tags?id=eq.${encodeURIComponent(tagId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), color }),
  });

  if (resp.status === 403) {
    enableLocalTagsMode();
    updateLocal();
    return;
  }

  await throwIfResponseFailed(resp, "Falha ao atualizar tag.");
}

export async function deleteTag(tagId: string): Promise<void> {
  if (!tagId) return;

  const deleteLocal = () => {
    writeLocalTags(readLocalTags().filter((tag) => tag.id !== tagId));
    const map = readLocalLeadTagMap();
    const next: LocalLeadTagMap = {};
    for (const [leadId, tagIds] of Object.entries(map)) {
      next[leadId] = tagIds.filter((currentTagId) => currentTagId !== tagId);
    }
    writeLocalLeadTagMap(next);
  };

  if (!canUseSupabase() || readLocalTagsMode() || tagId.startsWith("local-")) {
    deleteLocal();
    return;
  }

  const resp = await supabaseFetch(`tags?id=eq.${encodeURIComponent(tagId)}`, {
    method: "DELETE",
  });

  if (resp.status === 403) {
    enableLocalTagsMode();
    deleteLocal();
    return;
  }

  await throwIfResponseFailed(resp, "Falha ao excluir tag.");
}

export async function fetchLeadNotes(leadId: string): Promise<LeadNote[]> {
  if (!leadId) return [];
  const localNotes = readLocalLeadNotesMap()[leadId] || [];
  if (!canUseSupabase() || readLocalNotesMode()) return localNotes;

  const resp = await supabaseFetch(`lead_notes?select=id,note,created_at,updated_at&lead_id=eq.${encodeURIComponent(leadId)}&order=created_at.desc`);
  if (!resp.ok) {
    if (resp.status === 403) enableLocalNotesMode();
    return localNotes;
  }

  const remoteNotes = (await resp.json()) as LeadNote[];
  return Array.isArray(remoteNotes) ? mergeUniqueById(remoteNotes, localNotes) : localNotes;
}

export async function addLeadNote(leadId: string, note: string): Promise<void> {
  if (!leadId || !note.trim()) return;

  const createLocal = () => {
    const map = readLocalLeadNotesMap();
    const nextNote: LeadNote = {
      id: `local-note-${Date.now()}`,
      note: note.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    map[leadId] = [nextNote, ...(map[leadId] || [])];
    writeLocalLeadNotesMap(map);
  };

  if (!canUseSupabase() || readLocalNotesMode()) {
    createLocal();
    return;
  }

  const ownerId = getCurrentOwnerId();
  if (!ownerId) {
    createLocal();
    return;
  }

  const resp = await supabaseFetch("lead_notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ lead_id: leadId, author_id: ownerId, note }]),
  });

  if (resp.status === 403) {
    enableLocalNotesMode();
    createLocal();
    return;
  }

  await throwIfResponseFailed(resp, "Falha ao criar anotação.");
}

export async function updateLeadNote(noteId: string, note: string): Promise<void> {
  if (!noteId || !note.trim()) return;

  const updateLocal = () => {
    updateNoteInLocalStorage(noteId, (current) => ({
      ...current,
      note: note.trim(),
      updated_at: new Date().toISOString(),
    }));
  };

  if (!canUseSupabase() || readLocalNotesMode() || noteId.startsWith("local-note-")) {
    updateLocal();
    return;
  }

  const resp = await supabaseFetch(`lead_notes?id=eq.${encodeURIComponent(noteId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note: note.trim(), updated_at: new Date().toISOString() }),
  });

  if (resp.status === 403) {
    enableLocalNotesMode();
    updateLocal();
    return;
  }

  await throwIfResponseFailed(resp, "Falha ao atualizar anotação.");
}

export async function deleteLeadNote(noteId: string): Promise<void> {
  if (!noteId) return;

  const deleteLocal = () => {
    updateNoteInLocalStorage(noteId, () => null);
  };

  if (!canUseSupabase() || readLocalNotesMode() || noteId.startsWith("local-note-")) {
    deleteLocal();
    return;
  }

  const resp = await supabaseFetch(`lead_notes?id=eq.${encodeURIComponent(noteId)}`, {
    method: "DELETE",
  });

  if (resp.status === 403) {
    enableLocalNotesMode();
    deleteLocal();
    return;
  }

  await throwIfResponseFailed(resp, "Falha ao excluir anotação.");
}

export async function fetchLeadTasks(leadId: string): Promise<LeadTask[]> {
  if (!leadId) return [];
  const localTasks = readLocalLeadTasksMap()[leadId] || [];
  if (!canUseSupabase() || readLocalTasksMode()) return localTasks;

  const resp = await supabaseFetch(`tasks?select=id,title,description,status,due_at,created_at,updated_at&lead_id=eq.${encodeURIComponent(leadId)}&order=created_at.desc`);
  if (!resp.ok) {
    if (resp.status === 403) enableLocalTasksMode();
    return localTasks;
  }
  const rows = (await resp.json()) as LeadTask[];
  return Array.isArray(rows) ? mergeUniqueById(rows, localTasks) : localTasks;
}

export async function addLeadTask(leadId: string, title: string, dueAt?: string): Promise<void> {
  if (!leadId || !title.trim()) return;

  const createLocal = () => {
    const map = readLocalLeadTasksMap();
    const nextTask: LeadTask = {
      id: `local-task-${Date.now()}`,
      title: title.trim(),
      description: null,
      status: "aberta",
      due_at: dueAt || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    map[leadId] = [nextTask, ...(map[leadId] || [])];
    writeLocalLeadTasksMap(map);
  };

  if (!canUseSupabase() || readLocalTasksMode()) {
    createLocal();
    return;
  }

  const ownerId = getCurrentOwnerId();
  if (!ownerId) {
    createLocal();
    return;
  }

  const resp = await supabaseFetch("tasks", {
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

  if (resp.status === 403) {
    enableLocalTasksMode();
    createLocal();
    return;
  }

  await throwIfResponseFailed(resp, "Falha ao criar tarefa.");
}

export async function updateTaskStatus(taskId: string, status: LeadTask["status"]): Promise<void> {
  if (!taskId) return;

  const updateLocal = () => {
    updateTaskInLocalStorage(taskId, (current) => ({
      ...current,
      status,
      updated_at: new Date().toISOString(),
    }));
  };

  if (!canUseSupabase() || readLocalTasksMode() || taskId.startsWith("local-task-")) {
    updateLocal();
    return;
  }

  const resp = await supabaseFetch(`tasks?id=eq.${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });

  if (resp.status === 403) {
    enableLocalTasksMode();
    updateLocal();
    return;
  }

  await throwIfResponseFailed(resp, "Falha ao atualizar status da tarefa.");
}

export async function updateLeadTask(taskId: string, updates: Partial<Pick<LeadTask, "title" | "description" | "status">> & { due_at?: string | null }): Promise<void> {
  if (!taskId) return;

  const updateLocal = () => {
    updateTaskInLocalStorage(taskId, (current) => ({
      ...current,
      title: updates.title !== undefined ? updates.title.trim() : current.title,
      description: updates.description !== undefined ? updates.description?.trim() || null : current.description,
      status: updates.status !== undefined ? updates.status : current.status,
      due_at: updates.due_at !== undefined ? updates.due_at || null : current.due_at,
      updated_at: new Date().toISOString(),
    }));
  };

  if (!canUseSupabase() || readLocalTasksMode() || taskId.startsWith("local-task-")) {
    updateLocal();
    return;
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.due_at !== undefined) payload.due_at = updates.due_at || null;

  const resp = await supabaseFetch(`tasks?id=eq.${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (resp.status === 403) {
    enableLocalTasksMode();
    updateLocal();
    return;
  }

  await throwIfResponseFailed(resp, "Falha ao atualizar tarefa.");
}

export async function deleteLeadTask(taskId: string): Promise<void> {
  if (!taskId) return;

  const deleteLocal = () => {
    updateTaskInLocalStorage(taskId, () => null);
  };

  if (!canUseSupabase() || readLocalTasksMode() || taskId.startsWith("local-task-")) {
    deleteLocal();
    return;
  }

  const resp = await supabaseFetch(`tasks?id=eq.${encodeURIComponent(taskId)}`, {
    method: "DELETE",
  });

  if (resp.status === 403) {
    enableLocalTasksMode();
    deleteLocal();
    return;
  }

  await throwIfResponseFailed(resp, "Falha ao excluir tarefa.");
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

  const resp = await supabaseFetch("text_templates", {
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
  await throwIfResponseFailed(resp, "Falha ao salvar template.");
}
