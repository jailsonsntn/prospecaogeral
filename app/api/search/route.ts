import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString();
  const url = `https://minhareceita.org/${params ? `?${params}` : ""}`;

  try {
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json(
      { message: "Erro ao conectar à API Minha Receita." },
      { status: 502 }
    );
  }
}
