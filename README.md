# Riff Pro

App da Riff Sports para organizadores (educadores físicos, organizadores de eventos, campeonatos e jogos) venderem atividades direto para o próprio público, sem intermediários. PWA em React + Vite, com Supabase como backend.

Contexto do produto, decisões de arquitetura e regras de trabalho: [CLAUDE.md](CLAUDE.md).

## Rodando localmente

```bash
npm ci
cp .env.example .env.local   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

## Checks (os mesmos do CI)

```bash
npm run lint            # oxlint, falha com qualquer aviso
npm run check:ds        # design system: cores e fontes só por tokens
npm run check:encoding  # sem mojibake nos fontes
npm run build           # tsc + vite build
```

## Banco de dados (Supabase)

As migrations ficam em `supabase/migrations`. Quando um `git pull` trouxer migrations novas, elas precisam ser aplicadas no banco, senão as colunas novas não existem e os INSERTs falham com erro 400.

Antes de aplicar, confirme em qual projeto o CLI está ligado e o que falta aplicar:

```bash
npx supabase link --project-ref <ref-do-projeto>
npx supabase migration list
npx supabase db push
```

Nunca rode `db push` sem saber qual banco está ligado.

## Deploy (Vercel)

O `vercel.json` já configura o build (Vite) e faz toda rota do app (`/@organizador`, `/session/...`) abrir o `index.html`.

1. Importe o repositório na Vercel. O framework (Vite) é detectado.
2. Em **Settings → Environment Variables**, para Production e Preview:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (a chave *publishable*, nunca a secret)
   - `VITE_PUBLIC_URL` (opcional): o domínio final, por exemplo `https://riff.pro`
3. No Supabase, em **Authentication → URL Configuration**:
   - **Site URL:** o domínio de produção.
   - **Redirect URLs:** o domínio de produção e `https://*-<seu-time>.vercel.app/**`, para os previews.

   Sem isso, os e-mails de confirmação e de "esqueci a senha" apontam para o endereço errado.
4. Cada PR ganha um link de preview, e a `main` vira produção.
