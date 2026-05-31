import { NextRequest, NextResponse } from "next/server";
import { ensureApiAuth } from "@/lib/serverApiAuth";

export async function GET(req: NextRequest) {
  const authError = await ensureApiAuth(req);
  if (authError) return authError;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY não configurada no servidor." },
      { status: 500 }
    );
  }

  const address = String(req.nextUrl.searchParams.get("address") || "").trim();
  if (!address) {
    return NextResponse.json(
      { error: "Informe o endereço para geocodificação." },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", apiKey);

    const resp = await fetch(url.toString(), { cache: "no-store" });
    if (!resp.ok) {
      return NextResponse.json(
        { error: "Falha ao geocodificar endereço." },
        { status: 502 }
      );
    }

    const data = (await resp.json()) as {
      results?: Array<{
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      }>;
    };

    const first = data.results?.[0];
    const lat = first?.geometry?.location?.lat;
    const lng = first?.geometry?.location?.lng;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "Endereço não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        formattedAddress: first?.formatted_address || address,
        lat,
        lng,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erro ao conectar com a API de geocodificação." },
      { status: 502 }
    );
  }
}
