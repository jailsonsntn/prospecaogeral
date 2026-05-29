# Radar CNPJ

Aplicacao Next.js para busca de CNPJs e gestao de leads em CRM.

## Requisitos

- Node.js 18+
- Conta no Supabase

## Ambiente local

1. Copie `.env.example` para `.env.local`.
2. Preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Instale dependencias e rode:

```bash
npm install
npm run dev
```

## Deploy na Vercel

1. Suba o repositorio no GitHub.
2. Na Vercel, importe o repositorio.
3. Em Project Settings > Environment Variables, configure:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy.

## Seguranca

- Nao versione `.env.local`.
- Utilize apenas `publishable key` no frontend.
- Nunca exponha `service_role` no cliente.
- Logout automatico por inatividade de 1h com aviso previo.
