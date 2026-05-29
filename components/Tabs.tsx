"use client";

import { useState } from "react";
import SingleCnpj    from "./SingleCnpj";
import AdvancedSearch from "./AdvancedSearch";
import BatchLookup   from "./BatchLookup";

const TABS = [
  {
    id: "single",
    label: "Consulta Unitária",
    note: "Detalhamento completo por CNPJ",
  },
  {
    id: "search",
    label: "Pesquisa Avançada",
    note: "Cruze filtros para prospecção",
  },
  {
    id: "batch",
    label: "Painel em Lote",
    note: "Processamento sequencial de múltiplos CNPJs",
  },
] as const;

export default function Tabs() {
  const [active, setActive] = useState<string>("single");
  const activeTab = TABS.find((tab) => tab.id === active);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <div className="panel-card p-3">
          <p className="label-kicker mb-2">Modos de Pesquisa</p>
          <div className="space-y-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                  active === tab.id
                    ? "border-teal-700 bg-teal-50"
                    : "border-slate-200 bg-white hover:border-teal-300"
                }`}
              >
                <p className="font-display text-sm font-semibold text-slate-900">{tab.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{tab.note}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="panel-card p-4 sm:p-5">
          <p className="label-kicker">Modo ativo</p>
          <h3 className="font-display mt-1 text-xl font-semibold text-slate-900">{activeTab?.label}</h3>
          <p className="text-sm text-slate-600">{activeTab?.note}</p>
        </div>
      </div>

      <div className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              active === tab.id
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="panel-fade-up panel-card p-4 sm:p-6">
        {active === "single" && <SingleCnpj />}
        {active === "search" && <AdvancedSearch />}
        {active === "batch"  && <BatchLookup />}
      </div>
    </div>
  );
}
