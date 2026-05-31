import { NextRequest, NextResponse } from "next/server";

export async function ensureApiAuth(req: NextRequest): Promise<NextResponse | null> {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return NextResponse.json({ error: "Token de autenticação ausente." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ error: "Configuração de autenticação ausente." }, { status: 500 });
  }

  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!resp.ok) {
      return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
    }

    return null;
  } catch {
    return NextResponse.json({ error: "Falha ao validar autenticação." }, { status: 502 });
  }
}
