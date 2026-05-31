"use client";

import { useState } from "react";
import { CnpjData, normalizeCnpj, maskCnpj } from "@/lib/cnpj";
import { getAuthBearerHeader } from "@/lib/supabaseAuth";
import ResultsTable from "./ResultsTable";

export default function BatchLookup() {
  const [text, setText]         = useState("");
  const [maxBatch, setMaxBatch] = useState(20);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults]   = useState<CnpjData[] | null>(null);
  const [errors, setErrors]     = useState<string[]>([]);

  async function handleBatch() {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, maxBatch);
    if (!lines.length) return;

    setLoading(true); setProgress(0); setResults(null); setErrors([]);
    const ok: CnpjData[] = [];
    const errs: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const cnpj = normalizeCnpj(lines[i]);
      setProgress(Math.round(((i + 1) / lines.length) * 100));
      try {
        const resp = await fetch(`/api/cnpj/${cnpj}`, {
          headers: {
            ...getAuthBearerHeader(),
          },
        });
        const json = await resp.json();
        if (!resp.ok) errs.push(`${maskCnpj(cnpj)}: ${json.message ?? `HTTP ${resp.status}`}`);
        else ok.push(json);
      } catch { errs.push(`${maskCnpj(cnpj)}: Falha na conexão.`); }
    }

    setResults(ok); setErrors(errs); setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="panel-card p-5">
        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">CNPJs (um por linha)</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={"11222333000181\n22333444000192\n33.683.111/0002-80"}
            className="panel-input font-mono"
          />
        </div>
        <div className="flex items-center gap-4 mb-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Limite por lote:</label>
          <select
            value={maxBatch}
            onChange={(e) => setMaxBatch(Number(e.target.value))}
            className="panel-input w-auto"
          >
            {[5, 10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button
          onClick={handleBatch}
          disabled={loading || !text.trim()}
          className="panel-button w-full sm:w-auto"
        >
          {loading ? `Consultando... ${progress}%` : "Consultar lote"}
        </button>
      </div>

      {/* Barra de progresso */}
      {loading && (
        <div className="mb-5">
          <div className="h-2.5 w-full rounded-full bg-slate-200">
            <div
              className="h-2.5 rounded-full bg-teal-700 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-center text-xs text-slate-500">{progress}%</p>
        </div>
      )}

      {/* Erros */}
      {errors.length > 0 && (
        <details className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-red-700">
            {errors.length} erro{errors.length !== 1 ? "s" : ""}
          </summary>
          <ul className="mt-2 space-y-1">
            {errors.map((e, i) => <li key={i} className="text-xs text-red-600">{e}</li>)}
          </ul>
        </details>
      )}

      {results !== null && results.length === 0 && !loading && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Nenhum resultado válido obtido.
        </div>
      )}

      {results && results.length > 0 && (
        <ResultsTable rows={results} filename="lote_cnpj.csv" />
      )}
    </div>
  );
}
