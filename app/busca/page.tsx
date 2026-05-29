import Link from "next/link";
import Tabs from "@/components/Tabs";
import AuthGuard from "@/components/AuthGuard";

export default function BuscaPage() {
  return (
    <AuthGuard>
      <div className="space-y-5">
        <section className="dashboard-shell panel-fade-up p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr] lg:items-start">
            <div>
              <p className="label-kicker">Painel Inteligente</p>
              <h2 className="font-display mt-2 text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
                Pesquise CNPJs com visao de dashboard
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Alterna entre consulta por CNPJ, filtros avancados e processamento em lote no mesmo fluxo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <article className="panel-card p-4">
                <p className="text-2xl font-bold text-teal-700">1x</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">Consulta rapida</p>
              </article>
              <article className="panel-card p-4">
                <p className="text-2xl font-bold text-amber-600">N filtros</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">Busca avancada</p>
              </article>
              <article className="panel-card col-span-2 p-4">
                <p className="text-sm text-slate-500">Retorno direto da API Minha Receita</p>
                <p className="font-display mt-1 text-lg font-semibold text-slate-900">Exportacao CSV pronta</p>
                <Link
                  href="/crm"
                  className="mt-3 inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-slate-700"
                >
                  Abrir CRM de leads
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section className="dashboard-shell panel-fade-up-delay p-4 sm:p-6">
          <Tabs />
        </section>
      </div>
    </AuthGuard>
  );
}
