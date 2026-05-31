import { NextRequest, NextResponse } from "next/server";
import { ensureApiAuth } from "@/lib/serverApiAuth";

type GroqMode = "resumo" | "resposta" | "tarefa" | "prioridade";

export async function POST(req: NextRequest) {
  const authError = await ensureApiAuth(req);
  if (authError) return authError;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY não configurada no servidor." }, { status: 500 });
  }

  let body: {
    mode?: GroqMode;
    leadId?: string;
    lead?: Record<string, unknown>;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const mode = body.mode || "resumo";
  const lead = body.lead || {};
  const leadId = body.leadId || null;

  const systemPrompt =
    "Você é um assistente de CRM B2B em português do Brasil. Gere resposta objetiva, prática e acionável.";

  const modePrompt: Record<GroqMode, string> = {
    resumo: "Gere um resumo comercial curto deste lead, com potencial e risco.",
    resposta: "Gere uma mensagem inicial de abordagem comercial curta e personalizada.",
    tarefa: "Sugira as próximas 3 tarefas de follow-up com prioridade e prazo sugerido.",
    prioridade: "Classifique prioridade em baixa, média ou alta com justificativa curta.",
  };

  try {
    const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `${modePrompt[mode]}\n\nDados do lead:\n${JSON.stringify(lead, null, 2)}`,
          },
        ],
        temperature: 0.4,
      }),
      cache: "no-store",
    });

    if (!groqResp.ok) {
      const details = await groqResp.text();
      return NextResponse.json({ error: "Falha na chamada da IA GROQ.", details }, { status: 502 });
    }

    const data = (await groqResp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const output = data.choices?.[0]?.message?.content?.trim() || "Sem resposta da IA.";

    return NextResponse.json({ mode, leadId, output }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro interno no modulo IA." }, { status: 500 });
  }
}
