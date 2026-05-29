"use client";

import { useState } from "react";
import { CnpjData, normalizeCnpj, maskCnpj, serializeValue, downloadCsv } from "@/lib/cnpj";

export default function SingleCnpj() {
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState<CnpjData | null>(null);
  const [error, setError]     = useState("");
  const [showJson, setShowJson] = useState(false);

  async function handleSearch() {
    const cnpj = normalizeCnpj(input.trim());
    if (cnpj.length !== 14) { setError("CNPJ inválido. Informe 14 caracteres."); return; }
    setLoading(true); setError(""); setData(null);
    try {
      const resp = await fetch(`/api/cnpj/${cnpj}`);
      const json = await resp.json();
      if (!resp.ok) { setError(json.message ?? `Erro HTTP ${resp.status}`); return; }
      setData(json);
    } catch { setError("Falha ao conectar à API."); }
    finally { setLoading(false); }
  }

  const sv = (key: string) => serializeValue(data?.[key]) || "—";

  return (
    <div className="space-y-5">
      {/* Barra de busca */}
      <div className="flex gap-3 mb-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Ex.: 33.683.111/0002-80 ou 33683111000280"
          className="panel-input flex-1"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="panel-button"
        >
          {loading ? "Buscando..." : "Consultar"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {data && (
        <div className="space-y-5">
          {/* Destaque de contatos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Telefone 1", key: "ddd_telefone_1", icon: "📞" },
              { label: "Telefone 2", key: "ddd_telefone_2", icon: "📞" },
              { label: "Fax",        key: "ddd_fax",        icon: "📠" },
              { label: "E-mail",     key: "email",          icon: "✉️" },
            ].map(({ label, key, icon }) => {
              const val = sv(key);
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-4 text-center ${val !== "—" ? "border-teal-300 bg-teal-50" : "bg-white"}`}
                >
                  <div className="text-xl">{icon}</div>
                  <div className={`mt-1 break-all text-sm font-semibold ${val !== "—" ? "text-teal-700" : "text-slate-400"}`}>{val}</div>
                  <div className="mt-1 text-xs text-slate-500">{label}</div>
                </div>
              );
            })}
          </div>

          <hr className="border-slate-200" />

          {/* Cards principais */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="panel-card space-y-1.5 p-5">
              <h3 className="font-display mb-3 text-base font-semibold text-slate-900">Identificação</h3>
              {[
                ["CNPJ",                       maskCnpj(sv("cnpj"))],
                ["Razão Social",               sv("razao_social")],
                ["Nome Fantasia",              sv("nome_fantasia")],
                ["Situação",                   `${sv("situacao_cadastral")} — ${sv("descricao_situacao_cadastral")}`],
                ["Data Situação",              sv("data_situacao_cadastral")],
                ["Porte",                      `${sv("porte")} (cód. ${sv("codigo_porte")})`],
                ["Capital Social",             `R$ ${sv("capital_social")}`],
                ["Tipo",                       sv("descricao_identificador_matriz_filial")],
                ["Qualificação Responsável",   sv("qualificacao_do_responsavel")],
                ["Ente Federativo",            sv("ente_federativo_responsavel")],
              ].map(([k, v]) => (
                <div key={k} className="text-sm flex gap-1">
                  <span className="shrink-0 font-medium text-slate-500">{k}:</span>
                  <span className="text-slate-800">{v}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="panel-card space-y-1.5 p-5">
                <h3 className="font-display mb-3 text-base font-semibold text-slate-900">Atividade</h3>
                {[
                  ["CNAE principal",     `${sv("cnae_fiscal")} — ${sv("cnae_fiscal_descricao")}`],
                  ["CNAEs secundários",  sv("cnaes_secundarios")],
                  ["Natureza jurídica",  `${sv("natureza_juridica")} (cód. ${sv("codigo_natureza_juridica")})`],
                  ["Regime tributário",  sv("regime_tributario")],
                  ["Início atividade",   sv("data_inicio_atividade")],
                ].map(([k, v]) => (
                  <div key={k} className="text-sm flex gap-1">
                      <span className="shrink-0 font-medium text-slate-500">{k}:</span>
                      <span className="break-words text-slate-800">{v}</span>
                  </div>
                ))}
              </div>

                <div className="panel-card space-y-1.5 p-5">
                  <h3 className="font-display mb-3 text-base font-semibold text-slate-900">Simples / MEI</h3>
                {[
                  ["Simples Nacional", `${sv("opcao_pelo_simples")} | Entrada: ${sv("data_opcao_pelo_simples")} | Saída: ${sv("data_exclusao_do_simples")}`],
                  ["MEI",              `${sv("opcao_pelo_mei")} | Entrada: ${sv("data_opcao_pelo_mei")} | Saída: ${sv("data_exclusao_do_mei")}`],
                ].map(([k, v]) => (
                  <div key={k} className="text-sm flex gap-1">
                      <span className="shrink-0 font-medium text-slate-500">{k}:</span>
                      <span className="text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Endereço */}
            <div className="panel-card p-5">
              <h3 className="font-display mb-2 text-base font-semibold text-slate-900">Endereço</h3>
              <p className="text-sm text-slate-700">
              {[
                sv("descricao_tipo_de_logradouro"), sv("logradouro"), sv("numero"),
                sv("complemento"), sv("bairro"), sv("municipio"),
                `CEP ${sv("cep")}`, sv("uf"),
              ].filter((p) => p && p !== "—").join(", ")}
            </p>
          </div>

          {/* QSA */}
          {Array.isArray(data.qsa) && (data.qsa as unknown[]).length > 0 && (
            <div className="panel-card overflow-x-auto p-5">
              <h3 className="font-display mb-3 text-base font-semibold text-slate-900">Quadro Societário (QSA)</h3>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {Object.keys((data.qsa as Record<string, unknown>[])[0]).map((k) => (
                      <th key={k} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.qsa as Record<string, unknown>[]).map((socio, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {Object.values(socio).map((v, j) => (
                        <td key={j} className="whitespace-nowrap px-3 py-2 text-slate-700">{serializeValue(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => downloadCsv([data], `cnpj_${normalizeCnpj(sv("cnpj"))}.csv`)}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
            >
              Baixar como CSV
            </button>
            <button
              onClick={() => setShowJson(!showJson)}
              className="rounded-xl bg-slate-100 px-5 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-200"
            >
              {showJson ? "Ocultar" : "Ver"} JSON completo
            </button>
          </div>

          {showJson && (
            <pre className="max-h-96 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-300">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
