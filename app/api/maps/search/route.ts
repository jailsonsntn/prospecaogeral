import { NextRequest, NextResponse } from "next/server";
import { ensureApiAuth } from "@/lib/serverApiAuth";

type PlacesApiResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    types?: string[];
  }>;
  nextPageToken?: string;
};

export async function POST(req: NextRequest) {
  const authError = await ensureApiAuth(req);
  if (authError) return authError;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY não configurada no servidor." },
      { status: 500 }
    );
  }

  let body: {
    query?: string;
    locationText?: string;
    maxResults?: number;
    pageToken?: string;
    searchMode?: "radius" | "place";
    radiusKm?: number;
    latitude?: number;
    longitude?: number;
    city?: string;
    localType?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const query = String(body.query || "").trim();
  const locationText = String(body.locationText || "").trim();
  const city = String(body.city || "").trim();
  const localType = String(body.localType || "").trim();
  const searchMode = body.searchMode === "radius" ? "radius" : "place";
  const maxResults = Math.max(1, Math.min(20, Number(body.maxResults || 10)));
  const pageToken = String(body.pageToken || "").trim();
  const radiusKm = Math.max(1, Math.min(100, Number(body.radiusKm || 5)));
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (!query) {
    return NextResponse.json({ error: "Informe o segmento/termo da busca." }, { status: 400 });
  }

  const placeContext = [localType, city || locationText].filter(Boolean).join(" em ");
  const textQuery = placeContext ? `${query} ${placeContext}` : query;

  const payload: Record<string, unknown> = {
    textQuery,
    languageCode: "pt-BR",
    regionCode: "BR",
    maxResultCount: maxResults,
  };

  if (pageToken) {
    payload.pageToken = pageToken;
  }

  if (searchMode === "radius" && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    payload.locationBias = {
      circle: {
        center: {
          latitude,
          longitude,
        },
        radius: radiusKm * 1000,
      },
    };
  }

  try {
    const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.nationalPhoneNumber",
          "places.websiteUri",
          "places.googleMapsUri",
          "places.types",
          "nextPageToken",
        ].join(","),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!resp.ok) {
      const fallback = await resp.text();
      return NextResponse.json(
        { error: "Falha ao consultar Google Places.", details: fallback || `HTTP ${resp.status}` },
        { status: 502 }
      );
    }

    const data = (await resp.json()) as PlacesApiResponse;
    const results = (data.places || []).map((place) => ({
      id: place.id || "",
      name: place.displayName?.text || "Sem nome",
      address: place.formattedAddress || "",
      phone: place.nationalPhoneNumber || "",
      website: place.websiteUri || "",
      googleMapsUri: place.googleMapsUri || "",
      types: Array.isArray(place.types) ? place.types : [],
    }));

    return NextResponse.json(
      {
        total: results.length,
        results,
        nextPageToken: typeof data.nextPageToken === "string" ? data.nextPageToken : "",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Erro ao conectar com Google Places." }, { status: 502 });
  }
}
