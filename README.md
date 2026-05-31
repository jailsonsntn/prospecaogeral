# AllProspect

CRM de prospeccao comercial com foco em operacao diaria: captura de leads por CNPJ e Google Maps, funil kanban, enriquecimento e apoio de IA para priorizacao e acao.

Repositorio oficial:
https://github.com/jailsonsntn/prospecaogeral.git

## Visao do produto

- Prospeccao por CNPJ com fluxo de pesquisa unitaria, avancada e em lote.
- Prospeccao por mapa com Google Places (raio ou local textual) e exportacao CSV.
- CRM operacional com pipeline em kanban e movimentacao de status.
- Modulo de IA para resumo, abordagem, tarefas sugeridas e prioridade de lead.
- Autenticacao com Supabase e controle de sessao com timeout por inatividade.

## Stack

- Next.js 16 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Supabase Auth + REST
- Google Maps Places API + Geocoding API
- Groq API

## Variaveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- GOOGLE_MAPS_API_KEY
- GROQ_API_KEY

Observacao:
- Nunca comite `.env.local`.
- Use apenas chave publishable no frontend.
- Nao use service_role no cliente.

## Rodando localmente

1. Instale dependencias:

```bash
npm install
```

2. Inicie o projeto:

```bash
npm run dev
```

3. Abra no navegador:

```bash
http://localhost:3000
```

## Banco de dados (Supabase)

As migracoes SQL estao em `supabase/migrations`.

Ordem sugerida:

1. `01_drop_tables.sql`
2. `02_create_tables.sql`
3. `03_indexes.sql`
4. `04_enable_rls_and_policies.sql`

## Deploy na Vercel

1. Envie o codigo para o GitHub.
2. Na Vercel, clique em Add New Project e importe o repo `jailsonsntn/prospecaogeral`.
3. Em Project Settings > Environment Variables, cadastre:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   - GOOGLE_MAPS_API_KEY
   - GROQ_API_KEY
4. Build command: `npm run build`
5. Output: padrao Next.js
6. Deploy.

## Checklist de producao

- Variaveis de ambiente configuradas na Vercel.
- Supabase com tabelas, indices e RLS aplicados.
- Chave Google com Places e Geocoding habilitados.
- Chave Groq valida para o modulo de IA.
- Fluxos testados: login, CRM, prospeccao CNPJ, prospeccao mapa e logout.

## Scripts

```bash
npm run dev
npm run dev:turbo
npm run build
npm run start
```

## Seguranca e sessao

- Headers de seguranca configurados em `next.config.js`.
- Geolocalizacao permitida apenas no proprio dominio via Permissions-Policy.
- Timeout automatico de sessao com aviso ao usuario.
