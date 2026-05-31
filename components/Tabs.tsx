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

  return (
    <div className="space-y-5">
      <div className="panel-card p-3 sm:p-4">
        <p className="label-kicker mb-2">Modos de Pesquisa</p>
        <div className="grid gap-2 md:grid-cols-3">
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
              <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{tab.note}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-fade-up panel-card p-4 sm:p-6">
        {active === "single" && <SingleCnpj />}
        {active === "search" && <AdvancedSearch />}
        {active === "batch"  && <BatchLookup />}
      </div>
    </div>
  );
}
