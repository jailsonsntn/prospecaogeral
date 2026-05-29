"use client";

import { useState } from "react";
import { CnpjData } from "@/lib/cnpj";
import ResultsTable from "./ResultsTable";

const INPUT =
  "panel-input";
const LABEL = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

type StatusFilter = "all" | "ativa" | "baixada";
type MeiFilter = "all" | "sim" | "nao";

function parseDate(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const dt = new Date(`${raw}T00:00:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const dt = new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  return null;
}

function isMei(value: unknown): boolean | null {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return null;
  if (["S", "SIM", "TRUE", "1"].includes(raw)) return true;
  if (["N", "NAO", "NÃO", "FALSE", "0"].includes(raw)) return false;
  return null;
}

function matchesStatus(row: CnpjData, filter: StatusFilter): boolean {
  if (filter === "all") return true;

  const code = String(row.situacao_cadastral ?? "").trim();
  const desc = String(row.descricao_situacao_cadastral ?? "").trim().toUpperCase();

  const ativa = code === "2" || desc.includes("ATIVA");
  const baixada = code === "8" || desc.includes("BAIXADA");

  if (filter === "ativa") return ativa;
  return baixada;
}

function matchesMei(row: CnpjData, filter: MeiFilter): boolean {
  if (filter === "all") return true;
  const mei = isMei(row.opcao_pelo_mei);
  if (mei === null) return false;
  return filter === "sim" ? mei : !mei;
}

function matchesStartDate(row: CnpjData, from: string, to: string): boolean {
  if (!from && !to) return true;

  const valueDate = parseDate(row.data_inicio_atividade);
  if (!valueDate) return false;

  if (from) {
    const fromDate = new Date(`${from}T00:00:00`);
    if (valueDate < fromDate) return false;
  }
  if (to) {
    const toDate = new Date(`${to}T23:59:59`);
    if (valueDate > toDate) return false;
  }

  return true;
}

export default function AdvancedSearch() {
  const [form, setForm] = useState({
    uf: "", municipio: "", cnae: "", natureza_juridica: "",
    cnpf: "", limit: "100", cursor: "",
    inicio_de: "", inicio_ate: "", situacao: "all" as StatusFilter, mei: "all" as MeiFilter,
  });
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState<CnpjData[] | null>(null);
  const [nextCursor, setNextCursor] = useState("");
  const [rawCount, setRawCount] = useState(0);
  const [error, setError]       = useState("");

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSearch(cursorOverride?: string) {
    const params = new URLSearchParams();
    if (form.uf.trim())               params.set("uf",               form.uf.trim().toUpperCase());
    if (form.municipio.trim())        params.set("municipio",        form.municipio.replace(/\D/g, ""));
    if (form.cnae.trim())             params.set("cnae",             form.cnae.replace(/\D/g, ""));
    if (form.natureza_juridica.trim())params.set("natureza_juridica",form.natureza_juridica.replace(/\D/g, ""));
    if (form.cnpf.trim())             params.set("cnpf",             form.cnpf.replace(/[^0-9*]/g, ""));
    const cursor = cursorOverride ?? form.cursor;
    if (cursor.trim()) params.set("cursor", cursor.trim());
    params.set("limit", form.limit);

    setLoading(true); setError("");
    try {
      const resp = await fetch(`/api/search?${params}`);
      const json = await resp.json();
      if (!resp.ok) { setError(json.message ?? `Erro HTTP ${resp.status}`); return; }
      const data: CnpjData[] = Array.isArray(json) ? json : (json.data ?? []);
      setRawCount(data.length);

      const filtered = data.filter((row) => (
        matchesStatus(row, form.situacao) &&
        matchesMei(row, form.mei) &&
        matchesStartDate(row, form.inicio_de, form.inicio_ate)
      ));

      setResults(filtered);
      setNextCursor(typeof json.cursor === "string" ? json.cursor : "");
    } catch { setError("Falha ao conectar à API."); }
    finally { setLoading(false); }
  }

  function clearSmartFilters() {
    set("inicio_de", "");
    set("inicio_ate", "");
    set("situacao", "all");
    set("mei", "all");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <strong>Dica:</strong> combine <strong>UF + CNAE</strong> para respostas mais rapidas da API. Os filtros
        de <strong>situacao</strong>, <strong>MEI</strong> e <strong>inicio de atividade</strong> sao aplicados
        automaticamente nos resultados retornados.
      </div>

      <div className="panel-card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={LABEL}>UF</label>
            <input value={form.uf} onChange={(e) => set("uf", e.target.value)} placeholder="SP" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Município (código IBGE/SIAFI)</label>
            <input value={form.municipio} onChange={(e) => set("municipio", e.target.value)} placeholder="3550308" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>CNAE</label>
            <input value={form.cnae} onChange={(e) => set("cnae", e.target.value)} placeholder="6201501" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Natureza jurídica (código)</label>
            <input value={form.natureza_juridica} onChange={(e) => set("natureza_juridica", e.target.value)} placeholder="2062" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>CPF/CNPJ do sócio</label>
            <input value={form.cnpf} onChange={(e) => set("cnpf", e.target.value)} placeholder="***456789**" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Máximo de resultados</label>
            <select value={form.limit} onChange={(e) => set("limit", e.target.value)} className={INPUT}>
              {[10, 25, 50, 100, 200, 500, 1000].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Situação cadastral</label>
            <select value={form.situacao} onChange={(e) => set("situacao", e.target.value)} className={INPUT}>
              <option value="all">Todas</option>
              <option value="ativa">Ativa</option>
              <option value="baixada">Baixada</option>
            </select>
          </div>

          <div>
            <label className={LABEL}>MEI</label>
            <select value={form.mei} onChange={(e) => set("mei", e.target.value)} className={INPUT}>
              <option value="all">Todos</option>
              <option value="sim">Somente MEI</option>
              <option value="nao">Nao MEI</option>
            </select>
          </div>

          <div>
            <label className={LABEL}>Início de atividade (de)</label>
            <input
              type="date"
              value={form.inicio_de}
              onChange={(e) => set("inicio_de", e.target.value)}
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>Início de atividade (até)</label>
            <input
              type="date"
              value={form.inicio_ate}
              onChange={(e) => set("inicio_ate", e.target.value)}
              className={INPUT}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className={LABEL}>Cursor (próxima página)</label>
          <input
            value={form.cursor}
            onChange={(e) => set("cursor", e.target.value)}
            placeholder="Cole o cursor retornado para paginar os resultados"
            className={INPUT}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="panel-button w-full sm:w-auto"
          >
            {loading ? "Buscando..." : "Buscar empresas"}
          </button>

          <button
            type="button"
            onClick={clearSmartFilters}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Limpar filtros inteligentes
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {results !== null && results.length === 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Nenhuma empresa encontrada com esses filtros.
        </div>
      )}

      {results && results.length > 0 && (
        <div>
          <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
            {results.length} empresa{results.length !== 1 ? "s" : ""} apos filtros inteligentes (de {rawCount} retornadas pela API).
          </div>

          {nextCursor && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-sm text-slate-700">
                <strong>Próxima página:</strong>{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-xs">{nextCursor}</code>
              </span>
              <button
                onClick={() => { set("cursor", nextCursor); handleSearch(nextCursor); }}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
              >
                Carregar próxima página
              </button>
            </div>
          )}
          <ResultsTable rows={results} filename="prospeccao_cnpj.csv" />
        </div>
      )}
    </div>
  );
}
