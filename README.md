# AllProspect

CRM de prospecção comercial com foco em operação diária: captura de leads por CNPJ e Google Maps, funil kanban, enriquecimento e apoio de IA para priorização e ação.

Repositório oficial:
https://github.com/jailsonsntn/prospecaogeral.git

## Visão do produto

- Prospecção por CNPJ com fluxo de pesquisa unitária, avançada e em lote.
- Prospecção por mapa com Google Places (raio ou local textual) e exportação CSV.
- CRM operacional com pipeline em kanban e movimentação de status.
- Módulo de IA para resumo, abordagem, tarefas sugeridas e prioridade de lead.
- Autenticação com Supabase e controle de sessão com timeout por inatividade.

## Stack

- Next.js 16 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Supabase Auth + REST
- Google Maps Places API + Geocoding API
- Groq API

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- GOOGLE_MAPS_API_KEY
- GROQ_API_KEY

Observação:
- Nunca comite `.env.local`.
- Use apenas chave publishable no frontend.
- Não use service_role no cliente.

## Rodando localmente

1. Instale dependências:

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

As migrações SQL estão em `supabase/migrations`.

Ordem sugerida:

1. `01_drop_tables.sql`
2. `02_create_tables.sql`
3. `03_indexes.sql`
4. `04_enable_rls_and_policies.sql`

## Deploy na Vercel

1. Envie o código para o GitHub.
2. Na Vercel, clique em Add New Project e importe o repo `jailsonsntn/prospecaogeral`.
3. Em Project Settings > Environment Variables, cadastre:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   - GOOGLE_MAPS_API_KEY
   - GROQ_API_KEY
4. Build command: `npm run build`
5. Output: padrão Next.js
6. Deploy.

## Checklist de produção

- Variáveis de ambiente configuradas na Vercel.
- Supabase com tabelas, índices e RLS aplicados.
- Chave Google com Places e Geocoding habilitados.
- Chave Groq válida para o módulo de IA.
- Fluxos testados: login, CRM, prospecção CNPJ, prospecção mapa e logout.

## Scripts

```bash
npm run dev
npm run dev:turbo
npm run build
npm run start
```

## Segurança e sessão

- Headers de segurança configurados em `next.config.js`.
- Geolocalização permitida apenas no próprio domínio via Permissions-Policy.
- Timeout automático de sessão com aviso ao usuário.
