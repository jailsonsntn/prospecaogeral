import { NextRequest, NextResponse } from "next/server";
import { ensureApiAuth } from "@/lib/serverApiAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  const authError = await ensureApiAuth(req);
  if (authError) return authError;

  const { cnpj: rawCnpj } = await params;
  const cnpj = rawCnpj.replace(/[^0-9A-Za-z]/g, "").toUpperCase();

  try {
    const resp = await fetch(`https://minhareceita.org/${cnpj}`, {
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
