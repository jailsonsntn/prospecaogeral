"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { maskCnpj } from "@/lib/cnpj";
import {
  addAiSuggestion,
  addLeadNote,
  addLeadTask,
  addTemplate,
  assignTagToLead,
  createTag,
  CrmTag,
  fetchLeadNotes,
  fetchLeadTagIds,
  fetchLeadTasks,
  fetchTags,
  fetchTemplates,
  LeadNote,
  LeadTask,
  TextTemplate,
  unassignTagFromLead,
  updateTaskStatus,
} from "@/lib/crmExtras";
import {
  LeadItem,
  LeadStatus,
  fetchLeads,
  getLeadsEventName,
  upsertLeadByCurrentData,
} from "@/lib/leads";

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

function AiPageContent() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedLeadKey, setSelectedLeadKey] = useState("");

  const [tags, setTags] = useState<CrmTag[]>([]);
  const [leadTagIds, setLeadTagIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [templates, setTemplates] = useState<TextTemplate[]>([]);

  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#0f766e");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
  const [tplTitle, setTplTitle] = useState("");
  const [tplChannel, setTplChannel] = useState("whatsapp");
  const [tplContent, setTplContent] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [message, setMessage] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState<"operacao" | "conteudo">("operacao");

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.cnpj === selectedLeadKey) || null,
    [leads, selectedLeadKey]
  );

  useEffect(() => {
    let active = true;

    const reload = async () => {
      const [nextLeads, nextTags, nextTemplates] = await Promise.all([
        fetchLeads(),
        fetchTags(),
        fetchTemplates(),
      ]);
      if (!active) return;
      setLeads(nextLeads);
      setTags(nextTags);
      setTemplates(nextTemplates);

      const leadFromQuery = searchParams.get("lead") || "";
      if (leadFromQuery && nextLeads.some((lead) => lead.cnpj === leadFromQuery)) {
        setSelectedLeadKey(leadFromQuery);
      } else if (!selectedLeadKey && nextLeads[0]) {
        setSelectedLeadKey(nextLeads[0].cnpj);
      } else if (selectedLeadKey && !nextLeads.some((lead) => lead.cnpj === selectedLeadKey)) {
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
  }, [searchParams, selectedLeadKey]);

  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedLead?.id) {
        setLeadTagIds([]);
        setNotes([]);
        setTasks([]);
        return;
      }

      const [nextTagIds, nextNotes, nextTasks] = await Promise.all([
        fetchLeadTagIds(selectedLead.id),
        fetchLeadNotes(selectedLead.id),
        fetchLeadTasks(selectedLead.id),
      ]);
      setLeadTagIds(nextTagIds);
      setNotes(nextNotes);
      setTasks(nextTasks);
    };

    void loadDetails();
  }, [selectedLead?.id]);

  const stats = useMemo(() => {
    const byStatus = STATUS_OPTIONS.reduce<Record<LeadStatus, number>>(
      (acc, status) => ({ ...acc, [status]: 0 }),
      { novo: 0, contatado: 0, qualificado: 0, proposta: 0, fechado: 0, perdido: 0 }
    );

    for (const lead of leads) {
      byStatus[lead.status]++;
    }

    return byStatus;
  }, [leads]);

  const conversion = useMemo(() => {
    if (leads.length === 0) return "0%";
    const won = leads.filter((lead) => lead.status === "fechado").length;
    return `${Math.round((won / leads.length) * 100)}%`;
  }, [leads]);

  async function reloadLeadsOnly() {
    setLeads(await fetchLeads());
  }

  async function runAi(mode: "resumo" | "resposta" | "tarefa" | "prioridade") {
    if (!selectedLead) return;
    setAiOutput("Gerando resposta...");

    const resp = await fetch("/api/ai/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        leadId: selectedLead.id,
        lead: selectedLead,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      setAiOutput(data.error || "Falha ao gerar resposta de IA.");
      return;
    }

    const output = data.output || "Sem resposta.";
    setAiOutput(output);
    if (selectedLead.id) {
      await addAiSuggestion(selectedLead.id, mode, selectedLead as unknown as Record<string, unknown>, output);
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-4">
        <section className="panel-card p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr,240px]">
            <div>
              <p className="label-kicker">AI Workspace</p>
              <h2 className="font-display mt-1 text-2xl font-semibold text-slate-900">Tarefas, insights e copys</h2>
              <p className="mt-2 text-sm text-slate-600">Central para tratar funil, textos e operação assistida por IA.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lead ativo</label>
              <select
                value={selectedLeadKey}
                onChange={(e) => setSelectedLeadKey(e.target.value)}
                className="panel-input"
              >
                <option value="">Selecione um lead</option>
                {leads.map((lead) => (
                  <option key={lead.cnpj} value={lead.cnpj}>
                    {(lead.razaoSocial || lead.nomeFantasia || "Lead")} - {lead.source === "cnpj" ? maskCnpj(lead.cnpj) : lead.externalId}
                  </option>
                ))}
              </select>
              <Link href="/crm" className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Voltar ao CRM
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setWorkspaceTab("operacao")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                workspaceTab === "operacao"
                  ? "border-teal-300 bg-teal-50 text-teal-800"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              Operação
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceTab("conteudo")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                workspaceTab === "conteudo"
                  ? "border-teal-300 bg-teal-50 text-teal-800"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              Conteúdo
            </button>
          </div>
        </section>

        {workspaceTab === "operacao" && (
          <section className="grid gap-4 xl:grid-cols-[1fr,1fr]">
            <div className="space-y-4">
              {selectedLead && (
                <article className="panel-card p-4">
                  <p className="label-kicker">Lead ativo</p>
                  <h3 className="font-display mt-1 text-lg font-semibold text-slate-900">{selectedLead.razaoSocial || selectedLead.nomeFantasia || "Lead"}</h3>
                  <p className="text-xs text-slate-500">{selectedLead.source === "cnpj" ? maskCnpj(selectedLead.cnpj) : selectedLead.externalId}</p>

                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const selected = leadTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={async () => {
                              if (!selectedLead.id) return;
                              if (selected) {
                                await unassignTagFromLead(selectedLead.id, tag.id);
                              } else {
                                await assignTagToLead(selectedLead.id, tag.id);
                              }
                              setLeadTagIds(await fetchLeadTagIds(selectedLead.id));
                            }}
                            className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                              selected ? "border-teal-300 bg-teal-50 text-teal-800" : "border-slate-300 bg-white text-slate-600"
                            }`}
                            style={{ borderColor: tag.color || undefined }}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr,110px]">
                      <input
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        className="panel-input"
                        placeholder="Nova tag"
                      />
                      <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="panel-input h-10" />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newTagName.trim()) return;
                        await createTag(newTagName.trim(), newTagColor);
                        setNewTagName("");
                        setTags(await fetchTags());
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Criar tag
                    </button>
                  </div>
                </article>
              )}

              <article className="panel-card p-4">
                <p className="label-kicker">Tarefas</p>
                <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="panel-input mt-2" placeholder="Título da tarefa" />
                <input type="date" value={newTaskDueAt} onChange={(e) => setNewTaskDueAt(e.target.value)} className="panel-input mt-2" />
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedLead?.id || !newTaskTitle.trim()) return;
                    await addLeadTask(selectedLead.id, newTaskTitle, newTaskDueAt);
                    setNewTaskTitle("");
                    setNewTaskDueAt("");
                    setTasks(await fetchLeadTasks(selectedLead.id));
                  }}
                  className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Criar tarefa
                </button>
                <div className="mt-2 max-h-44 space-y-2 overflow-y-auto">
                  {tasks.map((task) => (
                    <label key={task.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs">
                      <input
                        type="checkbox"
                        checked={task.status === "concluida"}
                        onChange={async (e) => {
                          await updateTaskStatus(task.id, e.target.checked ? "concluida" : "aberta");
                          if (!selectedLead?.id) return;
                          setTasks(await fetchLeadTasks(selectedLead.id));
                        }}
                      />
                      <span className="text-slate-700">{task.title}</span>
                    </label>
                  ))}
                </div>
              </article>
            </div>

            <div className="space-y-4">
              <article className="panel-card p-4">
                <p className="label-kicker">Observações</p>
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={3} className="panel-input mt-2" placeholder="Nova anotação" />
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedLead?.id || !newNote.trim()) return;
                    await addLeadNote(selectedLead.id, newNote);
                    setNewNote("");
                    setNotes(await fetchLeadNotes(selectedLead.id));
                  }}
                  className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Adicionar nota
                </button>
                <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                  {notes.map((note) => (
                    <article key={note.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                      <p>{note.note}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{new Date(note.created_at).toLocaleString("pt-BR")}</p>
                    </article>
                  ))}
                </div>
              </article>
            </div>
          </section>
        )}

        {workspaceTab === "conteudo" && (
          <section className="grid gap-4 xl:grid-cols-[1fr,1.25fr]">
            <div className="space-y-4">
              <article className="panel-card p-4">
                <p className="label-kicker">Funil</p>
                <p className="mt-1 text-sm text-slate-600">Conversão geral: <span className="font-semibold text-slate-900">{conversion}</span></p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <div key={status} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{statusLabel(status)}</p>
                      <p className="text-lg font-semibold text-slate-900">{stats[status]}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel-card p-4">
                <p className="label-kicker">Analise com IA</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => runAi("resumo")} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">Resumo</button>
                  <button type="button" onClick={() => runAi("resposta")} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">Resposta</button>
                  <button type="button" onClick={() => runAi("tarefa")} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">Tarefas</button>
                  <button type="button" onClick={() => runAi("prioridade")} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">Prioridade</button>
                </div>
                <textarea
                  value={aiOutput}
                  onChange={(e) => setAiOutput(e.target.value)}
                  rows={6}
                  className="panel-input mt-2"
                  placeholder="Saída da IA"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedLead || !aiOutput.trim()) return;
                    const next = `${selectedLead.observacao}\n\n[IA]\n${aiOutput}`.trim();
                    await upsertLeadByCurrentData({ ...selectedLead, observacao: next });
                    await reloadLeadsOnly();
                    setMessage("Saída da IA adicionada em observações.");
                  }}
                  className="mt-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                >
                  Salvar no lead
                </button>
              </article>
            </div>

            <div className="space-y-4">
              <article className="panel-card p-4">
                <p className="label-kicker">Textos e copys</p>
                <input value={tplTitle} onChange={(e) => setTplTitle(e.target.value)} className="panel-input mt-2" placeholder="Título do template" />
                <input value={tplChannel} onChange={(e) => setTplChannel(e.target.value)} className="panel-input mt-2" placeholder="Canal (whatsapp, email...)" />
                <textarea value={tplContent} onChange={(e) => setTplContent(e.target.value)} rows={3} className="panel-input mt-2" placeholder="Conteúdo do template" />
                <button
                  type="button"
                  onClick={async () => {
                    if (!tplTitle.trim() || !tplContent.trim()) return;
                    await addTemplate(tplTitle, tplChannel, tplContent);
                    setTplTitle("");
                    setTplContent("");
                    setTemplates(await fetchTemplates());
                  }}
                  className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Salvar template
                </button>
                <select
                  value={selectedTemplateId}
                  onChange={async (e) => {
                    setSelectedTemplateId(e.target.value);
                    const selectedTemplate = templates.find((tpl) => tpl.id === e.target.value);
                    if (!selectedTemplate || !selectedLead) return;
                    const next = `${selectedLead.observacao}\n\n${selectedTemplate.content}`.trim();
                    await upsertLeadByCurrentData({ ...selectedLead, observacao: next });
                    await reloadLeadsOnly();
                    setMessage("Template aplicado em observações do lead.");
                  }}
                  className="panel-input mt-2"
                >
                  <option value="">Aplicar template no lead</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>{tpl.title}</option>
                  ))}
                </select>
              </article>
            </div>
          </section>
        )}

        {message && <section className="panel-card p-3 text-sm text-slate-700">{message}</section>}
      </div>
    </AuthGuard>
  );
}

export default function AiPage() {
  return (
    <Suspense
      fallback={
        <section className="panel-card p-5 text-sm text-slate-600">
          Carregando workspace de IA...
        </section>
      }
    >
      <AiPageContent />
    </Suspense>
  );
}
