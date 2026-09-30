# Riff Profissionais

O Riff Profissionais é um Progressive Web App (PWA) projetado...

## Comandos Úteis

- **Dev:** `npm run dev`
- **Build:** `npm run build`
- **Lint:** `npm run lint`

## Sincronização com o Banco de Dados (Supabase)

> **ATENÇÃO:** Sempre que fizer um `git pull` e receber novos arquivos na pasta `supabase/migrations`, é obrigatório rodar o comando abaixo para aplicar as alterações no seu banco de dados (seja ele local ou remoto):
>
> ```bash
> npx supabase db push
> ```
> Sem isso, as novas colunas (como `kind` ou `city`) não existirão e as inserções (INSERT) irão falhar silenciosamente ou gerar erros 400.
