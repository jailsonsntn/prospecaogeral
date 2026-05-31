"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { upsertLeadFromMapResult } from "@/lib/leads";
import { getAuthBearerHeader } from "@/lib/supabaseAuth";

type SearchMode = "radius" | "place";

interface MapResultItem {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  googleMapsUri: string;
  types?: string[];
}

type SocialItem = {
  label: string;
  url: string;
};

function toCsvValue(value: string): string {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

export default function ProspeccaoMapaPage() {
  const router = useRouter();

  const [searchMode, setSearchMode] = useState<SearchMode>("radius");
  const [query, setQuery] = useState("restaurante");
  const [locationText, setLocationText] = useState("");
  const [localType, setLocalType] = useState("Cidade");
  const [city, setCity] = useState("");
  const [pages, setPages] = useState(1);
  const [radiusKm, setRadiusKm] = useState(5);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<MapResultItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  const [onlyWithSite, setOnlyWithSite] = useState(false);
  const [onlyWithoutSite, setOnlyWithoutSite] = useState(false);
  const [onlyWithSocial, setOnlyWithSocial] = useState(false);
  const [onlyWithoutSocial, setOnlyWithoutSocial] = useState(false);
  const [expandCards, setExpandCards] = useState(false);
  const [collapseSearchPanel, setCollapseSearchPanel] = useState(false);

  const hasSocial = (item: MapResultItem): boolean => {
    const target = `${item.website || ""} ${item.googleMapsUri || ""}`.toLowerCase();
    return ["instagram", "facebook", "linkedin", "youtube", "tiktok"].some((key) => target.includes(key));
  };

  const toWhatsappLink = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return "";
    return `https://wa.me/${digits}`;
  };

  const toHostLabel = (url: string): string => {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return host || url;
    } catch {
      return url;
    }
  };

  const getSocialLinks = (item: MapResultItem): SocialItem[] => {
    const source = [item.website, item.googleMapsUri].filter(Boolean) as string[];
    const map: Array<{ key: string; label: string }> = [
      { key: "instagram", label: "Instagram" },
      { key: "facebook", label: "Facebook" },
      { key: "linkedin", label: "LinkedIn" },
      { key: "youtube", label: "YouTube" },
      { key: "tiktok", label: "TikTok" },
    ];

    const found: SocialItem[] = [];
    for (const social of map) {
      const url = source.find((entry) => entry.toLowerCase().includes(social.key));
      if (url && !found.some((itemFound) => itemFound.label === social.label)) {
        found.push({ label: social.label, url });
      }
    }
    return found;
  };

  const filteredResults = results.filter((item) => {
    const withPhone = Boolean(item.phone);
    const withSite = Boolean(item.website);
    const withSocial = hasSocial(item);

    if (onlyWithPhone && !withPhone) return false;
    if (onlyWithSite && !withSite) return false;
    if (onlyWithoutSite && withSite) return false;
    if (onlyWithSocial && !withSocial) return false;
    if (onlyWithoutSocial && withSocial) return false;
    return true;
  });

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function downloadCsv(rows: MapResultItem[], filename: string) {
    const header = ["id", "nome", "endereco", "telefone", "website", "google_maps", "tipos"];
    const lines = rows.map((item) => [
      toCsvValue(item.id),
      toCsvValue(item.name),
      toCsvValue(item.address),
      toCsvValue(item.phone),
      toCsvValue(item.website),
      toCsvValue(item.googleMapsUri),
      toCsvValue((item.types || []).join(" | ")),
    ].join(","));

    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalização não suportada neste navegador."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => reject(new Error("Não foi possível obter sua localização atual.")),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async function handleSearch() {
    if (!query.trim()) {
      setError("Informe o segmento para pesquisar.");
      return;
    }

    if (searchMode === "place" && !city.trim() && !locationText.trim()) {
      setError("Informe cidade, bairro ou local para continuar.");
      return;
    }

    if (searchMode === "radius" && !useCurrentLocation && !locationText.trim()) {
      setError("Informe um local manual para busca por raio.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setSelectedIds(new Set());

    try {
      let lat = currentLat;
      let lng = currentLng;

      if (searchMode === "radius" && useCurrentLocation && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
        const pos = await getCurrentPosition();
        lat = pos.lat;
        lng = pos.lng;
        setCurrentLat(pos.lat);
        setCurrentLng(pos.lng);
      }

      if (searchMode === "radius" && !useCurrentLocation && locationText.trim()) {
        const geoResp = await fetch(`/api/maps/geocode?address=${encodeURIComponent(locationText.trim())}`, {
          headers: {
            ...getAuthBearerHeader(),
          },
        });
        const geoData = await geoResp.json();
        if (!geoResp.ok) {
          setResults([]);
          setError(geoData.error || "Não foi possível geocodificar o local informado.");
          return;
        }

        lat = Number(geoData.lat);
        lng = Number(geoData.lng);
      }

      const maxPages = Math.max(1, Math.min(10, Number(pages || 1)));
      const aggregate: MapResultItem[] = [];
      let pageToken = "";

      for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
        const resp = await fetch("/api/maps/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthBearerHeader(),
          },
          body: JSON.stringify({
            query,
            maxResults: 20,
            pageToken,
            searchMode,
            radiusKm,
            latitude: lat,
            longitude: lng,
            localType,
            city,
            locationText,
          }),
        });

        const data = await resp.json();
        if (!resp.ok) {
          setResults([]);
          setError(data.error || "Falha ao buscar empresas no mapa.");
          return;
        }

        const pageResults = Array.isArray(data.results) ? (data.results as MapResultItem[]) : [];
        for (const item of pageResults) {
          if (!aggregate.some((existing) => existing.id === item.id)) {
            aggregate.push(item);
          }
        }

        pageToken = typeof data.nextPageToken === "string" ? data.nextPageToken : "";
        if (!pageToken) break;
      }

      setResults(aggregate);
      setMessage(`${aggregate.length} empresa(s) encontrada(s).`);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : "Falha de conexão durante a busca.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-5">
        <section className="dashboard-shell panel-fade-up p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="label-kicker">Prospecção Mapa</p>
              <h2 className="font-display mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                Captação por Google Maps
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
                Pesquise empresas por segmento e localidade. Cada resultado pode ser enviado ao CRM imediatamente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCollapseSearchPanel((current) => !current)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {collapseSearchPanel ? "Expandir busca" : "Retrair busca"}
            </button>
          </div>

          {!collapseSearchPanel && (
          <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSearchMode("radius")}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                searchMode === "radius"
                  ? "border-teal-300 bg-teal-100 text-teal-900"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              Busca por raio
            </button>
            <button
              type="button"
              onClick={() => setSearchMode("place")}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                searchMode === "place"
                  ? "border-teal-300 bg-teal-100 text-teal-900"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              Busca por cidade, bairro ou local
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Busca por raio: usa um ponto central e distância máxima. Busca por cidade/bairro/local: pesquisa por região textual.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-[1.3fr,0.7fr]">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Segmento</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="panel-input"
                placeholder="Ex.: restaurante, clínica odontológica, mercado"
              />
              <p className="mt-1 text-xs text-slate-500">Define o tipo de empresa que você deseja encontrar.</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Páginas de resultado</label>
              <input
                type="number"
                min={1}
                max={10}
                value={pages}
                onChange={(e) => setPages(Number(e.target.value) || 1)}
                className="panel-input"
                placeholder="1 a 10"
              />
              <p className="mt-1 text-xs text-slate-500">Cada página tenta buscar até 20 locais. Mais páginas = maior cobertura.</p>
            </div>
          </div>

          {searchMode === "radius" ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Raio da busca: {radiusKm} km</p>
              <p className="text-xs text-slate-500">Controla a distância máxima a partir do ponto escolhido.</p>

              <div className="grid gap-3 md:grid-cols-[1fr,120px]">
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value) || 5)}
                />
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value) || 5)}
                  className="panel-input"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setUseCurrentLocation(true)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                    useCurrentLocation
                      ? "border-teal-300 bg-teal-100 text-teal-900"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  Usar localização atual
                </button>
                <button
                  type="button"
                  onClick={() => setUseCurrentLocation(false)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                    !useCurrentLocation
                      ? "border-teal-300 bg-teal-100 text-teal-900"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  Informar local manual
                </button>
              </div>
              <p className="text-xs text-slate-500">Localização atual usa GPS do navegador. Local manual usa um endereço/cidade informado por você.</p>

              {!useCurrentLocation && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Local manual</label>
                  <input
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    className="panel-input"
                    placeholder="Cidade, bairro ou região"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr,1fr]">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de local</label>
                <select
                  value={localType}
                  onChange={(e) => setLocalType(e.target.value)}
                  className="panel-input"
                >
                  {[
                    "Cidade",
                    "Bairro",
                    "Região",
                    "Avenida",
                    "Shopping",
                    "Ponto turístico",
                  ].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cidade ou local</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="panel-input"
                  placeholder="Ex.: Praia Grande, Centro, Shopping X"
                />
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {loading ? "Buscando..." : "Buscar empresas"}
            </button>

            <button
              type="button"
              onClick={() => downloadCsv(filteredResults, "maps_filtrado.csv")}
              disabled={filteredResults.length === 0}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Exportar filtro (CSV)
            </button>

            <button
              type="button"
              onClick={() => {
                const selected = filteredResults.filter((item) => selectedIds.has(item.id));
                downloadCsv(selected, "maps_selecionados.csv");
              }}
              disabled={filteredResults.filter((item) => selectedIds.has(item.id)).length === 0}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Exportar selecionados
            </button>

            <Link
              href="/crm"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Abrir CRM
            </Link>
          </div>
          <p className="mt-2 text-xs text-slate-500">Exportar filtro baixa todos os resultados atuais. Exportar selecionados baixa apenas os cards marcados.</p>

          {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          </>
          )}

          {collapseSearchPanel && (
            <p className="mt-3 text-sm text-slate-600">Painel de busca retraído. Clique em "Expandir busca" para editar os filtros.</p>
          )}
        </section>

        <section className="panel-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-2xl font-semibold text-slate-900">Resultados ({filteredResults.length})</p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setExpandCards((current) => !current)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {expandCards ? "Retrair cards" : "Expandir cards"}
              </button>

              <div className="flex flex-wrap gap-4 text-sm text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={onlyWithPhone} onChange={(e) => setOnlyWithPhone(e.target.checked)} />
                Com telefone
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={onlyWithSite} onChange={(e) => setOnlyWithSite(e.target.checked)} />
                Com site
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={onlyWithoutSite} onChange={(e) => setOnlyWithoutSite(e.target.checked)} />
                Sem site
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={onlyWithSocial} onChange={(e) => setOnlyWithSocial(e.target.checked)} />
                Com redes sociais
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={onlyWithoutSocial} onChange={(e) => setOnlyWithoutSocial(e.target.checked)} />
                Sem redes sociais
              </label>
              </div>
            </div>
          </div>
        </section>

        {filteredResults.length > 0 && (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredResults.map((item) => (
              <article key={item.id} className="panel-card p-4">
                <label className="mb-2 inline-flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                  />
                  Selecionar para exportação
                </label>

                <p className="font-display text-lg font-semibold text-slate-900">{item.name}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${item.phone ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                    {item.phone ? "Telefone ok" : "Sem telefone"}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${item.website ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                    {item.website ? "Site ok" : "Sem site"}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${hasSocial(item) ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                    {hasSocial(item) ? "Com redes" : "Sem redes"}
                  </span>
                </div>

                {expandCards && (
                <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Endereço</p>
                    <p className="text-slate-700">{item.address || "Endereço não informado"}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Telefone</p>
                    {item.phone ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <a href={`tel:${item.phone}`} className="font-semibold text-slate-800 hover:text-slate-900">{item.phone}</a>
                        {toWhatsappLink(item.phone) && (
                          <a
                            href={toWhatsappLink(item.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500">Não informado</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">E-mail</p>
                    <p className="text-slate-500">Não informado pela API do Google Places</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Site</p>
                    {item.website ? (
                      <a href={item.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-800 hover:text-teal-900">
                        {toHostLabel(item.website)}
                      </a>
                    ) : (
                      <p className="text-slate-500">Não informado</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Redes sociais</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {getSocialLinks(item).length > 0 ? (
                        getSocialLinks(item).map((social) => (
                          <a
                            key={`${item.id}-${social.label}`}
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-100"
                          >
                            {social.label}
                          </a>
                        ))
                      ) : (
                        <p className="text-slate-500">Nenhuma rede social identificada</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Categoria</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(item.types || []).slice(0, 5).map((type) => (
                        <span key={`${item.id}-${type}`} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {type}
                        </span>
                      ))}
                      {(!item.types || item.types.length === 0) && <p className="text-slate-500">Não informada</p>}
                    </div>
                  </div>
                </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await upsertLeadFromMapResult({
                        placeId: item.id,
                        name: item.name,
                        phone: item.phone,
                        address: item.address,
                        website: item.website,
                      });
                      setMessage(`Lead ${item.name} adicionado ao CRM.`);
                    }}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    Adicionar ao CRM
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await upsertLeadFromMapResult({
                        placeId: item.id,
                        name: item.name,
                        phone: item.phone,
                        address: item.address,
                        website: item.website,
                      });
                      router.push("/crm");
                    }}
                    className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800 hover:bg-teal-100"
                  >
                    Adicionar e abrir CRM
                  </button>
                  {item.googleMapsUri && (
                    <a
                      href={item.googleMapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Ver no mapa
                    </a>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="panel-card p-4">
          <p className="text-sm text-slate-600">
            Dica: use a opção "Adicionar e abrir CRM" para seguir imediatamente com o contato e classificação do lead.
          </p>
        </section>
      </div>
    </AuthGuard>
  );
}
