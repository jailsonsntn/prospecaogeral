"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ALL_COLUMNS,
  PRIORITY_COLS,
  CONTACT_COLS,
  CnpjData,
  normalizeRow,
  downloadCsv,
  countContacts,
  maskCnpj,
  serializeValue,
} from "@/lib/cnpj";
import { getLeadKeyFromRow, getLeads, getLeadsEventName, removeLead, upsertLeadFromRow } from "@/lib/leads";

interface Props {
  rows: CnpjData[];
  filename?: string;
}

export default function ResultsTable({ rows, filename = "cnpj.csv" }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CnpjData | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [leadKeys, setLeadKeys] = useState<Set<string>>(new Set());

  function reloadLeadKeys() {
    const keys = new Set(getLeads().map((lead) => lead.cnpj));
    setLeadKeys(keys);
  }

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedRow(null);
      }
    }

    const leadsEvent = getLeadsEventName();
    reloadLeadKeys();

    window.addEventListener("keydown", onEscape);
    window.addEventListener(leadsEvent, reloadLeadKeys);
    window.addEventListener("storage", reloadLeadKeys);

    return () => {
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener(leadsEvent, reloadLeadKeys);
      window.removeEventListener("storage", reloadLeadKeys);
    };
  }, []);

  if (rows.length === 0) return null;

  const { withPhone, withEmail, withAny } = countContacts(rows);
  const withoutContact = rows.length - withAny;
  const sv = (key: string) => serializeValue(selectedRow?.[key]) || "-";

  const columns = showAll ? [...ALL_COLUMNS] : PRIORITY_COLS.filter((c) => ALL_COLUMNS.includes(c));

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Empresas",       value: rows.length,    color: "text-slate-900" },
          { label: "Com telefone",   value: withPhone,      color: "text-teal-700" },
          { label: "Com e-mail",     value: withEmail,      color: "text-cyan-700" },
          { label: "Sem contato",    value: withoutContact, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="panel-card p-4 text-center">
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="rounded border-slate-300 text-teal-700"
          />
          Exibir todas as colunas ({ALL_COLUMNS.length})
        </label>
        <button
          onClick={() => downloadCsv(rows, filename)}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
        >
          Baixar CSV - {rows.length} empresa{rows.length !== 1 ? "s" : ""}
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className={`whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500
                    ${col === "cnpj" ? "sticky left-0 z-10 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" : ""}
                    ${CONTACT_COLS.includes(col) ? "bg-teal-50 text-teal-700" : ""}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, rowIdx) => {
              const norm = normalizeRow(row);
              return (
                <tr key={rowIdx} className="transition-colors hover:bg-slate-50">
                  {columns.map((col) => {
                    const val = norm[col] ?? "";
                    const isContact = CONTACT_COLS.includes(col);
                    return (
                      <td
                        key={col}
                        title={val}
                        className={`max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2
                          ${col === "cnpj" ? "sticky left-0 z-10 bg-white font-mono font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.07)]" : ""}
                          ${isContact && val ? "font-medium text-teal-700" : "text-slate-700"}`}
                      >
                        {col === "cnpj" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRow(row);
                                setShowJson(false);
                              }}
                              className="rounded px-1 py-0.5 text-left text-teal-700 hover:bg-teal-50 hover:underline"
                            >
                              {maskCnpj(val)}
                            </button>
                            {leadKeys.has(getLeadKeyFromRow(row)) && (
                              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                Lead
                              </span>
                            )}
                          </div>
                        ) : (
                          val
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="label-kicker">Visualização Completa</p>
                <h3 className="font-display mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
                  {maskCnpj(sv("cnpj"))}
                </h3>
                <p className="text-sm text-slate-600">{sv("razao_social")}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Telefone 1", key: "ddd_telefone_1" },
                { label: "Telefone 2", key: "ddd_telefone_2" },
                { label: "E-mail", key: "email" },
                { label: "Situação", key: "descricao_situacao_cadastral" },
              ].map((item) => (
                <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-900">{sv(item.key)}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-xl border border-slate-200 p-4">
                <h4 className="font-display mb-3 text-base font-semibold text-slate-900">Identificação</h4>
                {[
                  ["Razão Social", sv("razao_social")],
                  ["Nome Fantasia", sv("nome_fantasia")],
                  ["Porte", `${sv("porte")} (cod. ${sv("codigo_porte")})`],
                  ["Capital Social", sv("capital_social")],
                  ["Matriz/Filial", sv("descricao_identificador_matriz_filial")],
                  ["Ente Federativo", sv("ente_federativo_responsavel")],
                ].map(([k, v]) => (
                  <div key={k} className="mb-1 text-sm">
                    <span className="font-medium text-slate-500">{k}: </span>
                    <span className="text-slate-800">{v}</span>
                  </div>
                ))}
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <h4 className="font-display mb-3 text-base font-semibold text-slate-900">Atividade</h4>
                {[
                  ["CNAE Principal", `${sv("cnae_fiscal")} - ${sv("cnae_fiscal_descricao")}`],
                  ["CNAEs Secundários", sv("cnaes_secundarios")],
                  ["Natureza Jurídica", `${sv("natureza_juridica")} (cod. ${sv("codigo_natureza_juridica")})`],
                  ["Regime Tributário", sv("regime_tributario")],
                  ["Início de Atividade", sv("data_inicio_atividade")],
                ].map(([k, v]) => (
                  <div key={k} className="mb-1 text-sm">
                    <span className="font-medium text-slate-500">{k}: </span>
                    <span className="break-words text-slate-800">{v}</span>
                  </div>
                ))}
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <h4 className="font-display mb-3 text-base font-semibold text-slate-900">Situação Cadastral</h4>
                {[
                  ["Situação", `${sv("situacao_cadastral")} - ${sv("descricao_situacao_cadastral")}`],
                  ["Data da Situação", sv("data_situacao_cadastral")],
                  ["Motivo", `${sv("motivo_situacao_cadastral")} - ${sv("descricao_motivo_situacao_cadastral")}`],
                  ["Situação Especial", sv("situacao_especial")],
                  ["Data Situação Especial", sv("data_situacao_especial")],
                ].map(([k, v]) => (
                  <div key={k} className="mb-1 text-sm">
                    <span className="font-medium text-slate-500">{k}: </span>
                    <span className="text-slate-800">{v}</span>
                  </div>
                ))}
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <h4 className="font-display mb-3 text-base font-semibold text-slate-900">Simples e MEI</h4>
                {[
                  ["Optante Simples", sv("opcao_pelo_simples")],
                  ["Data Opção Simples", sv("data_opcao_pelo_simples")],
                  ["Data Exclusão Simples", sv("data_exclusao_do_simples")],
                  ["Optante MEI", sv("opcao_pelo_mei")],
                  ["Data Opção MEI", sv("data_opcao_pelo_mei")],
                  ["Data Exclusão MEI", sv("data_exclusao_do_mei")],
                ].map(([k, v]) => (
                  <div key={k} className="mb-1 text-sm">
                    <span className="font-medium text-slate-500">{k}: </span>
                    <span className="text-slate-800">{v}</span>
                  </div>
                ))}
              </section>
            </div>

            <section className="mt-4 rounded-xl border border-slate-200 p-4">
              <h4 className="font-display mb-2 text-base font-semibold text-slate-900">Endereço</h4>
              <p className="text-sm text-slate-700">
                {[
                  sv("descricao_tipo_de_logradouro"),
                  sv("logradouro"),
                  sv("numero"),
                  sv("complemento"),
                  sv("bairro"),
                  sv("municipio"),
                  `CEP ${sv("cep")}`,
                  sv("uf"),
                  sv("pais"),
                ].filter((v) => v && v !== "-").join(", ") || "-"}
              </p>
            </section>

            {Array.isArray(selectedRow.qsa) && (selectedRow.qsa as unknown[]).length > 0 && (
              <section className="mt-4 overflow-x-auto rounded-xl border border-slate-200 p-4">
                <h4 className="font-display mb-2 text-base font-semibold text-slate-900">Quadro Societário (QSA)</h4>
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {Object.keys((selectedRow.qsa as Record<string, unknown>[])[0]).map((k) => (
                        <th key={k} className="whitespace-nowrap px-2 py-2 text-left text-xs font-semibold uppercase text-slate-500">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedRow.qsa as Record<string, unknown>[]).map((socio, idx) => (
                      <tr key={idx}>
                        {Object.values(socio).map((v, jdx) => (
                          <td key={jdx} className="whitespace-nowrap px-2 py-2 text-slate-700">
                            {serializeValue(v) || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!selectedRow) return;
                  const key = getLeadKeyFromRow(selectedRow);
                  if (leadKeys.has(key)) {
                    removeLead(key);
                  } else {
                    upsertLeadFromRow(selectedRow);
                  }
                  reloadLeadKeys();
                }}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
              >
                {selectedRow && leadKeys.has(getLeadKeyFromRow(selectedRow)) ? "Remover do CRM" : "Marcar como lead"}
              </button>

              <Link
                href="/crm"
                className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800 hover:bg-teal-100"
              >
                Ir para CRM
              </Link>

              <button
                type="button"
                onClick={() => setShowJson((v) => !v)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {showJson ? "Ocultar JSON" : "Ver JSON completo"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Fechar painel
              </button>
            </div>

            {showJson && (
              <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-emerald-300">
                {JSON.stringify(selectedRow, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
