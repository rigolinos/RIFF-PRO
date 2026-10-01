# Riff Pro: contexto do projeto

Leitura obrigatória antes de qualquer tarefa, para o Claude Code e para qualquer dev. Se uma tarefa conflitar com este documento, pare e pergunte ao dono do produto.

## 1. Visão: Riff Sports

Riff Sports é a marca-mãe de um ecossistema esportivo: perfil do esportista (métricas, jogos, locais, avaliação, gamificação), jogos criados pelo próprio esportista, marketplace de educadores físicos, visibilidade para locais, rankings e campeonatos.

Tudo junto é grande demais e depende de uma densidade de usuários que ainda não existe. Por isso a visão foi dividida em dois produtos, cada um atacando uma dor concreta de um público que já existe. A unificação vem quando um dos dois provar que funciona.

## 2. Os dois produtos

| | **Riff Pro** (este repo, em construção) | **Riff Clubes** (depois do Pro) |
|---|---|---|
| Dor | O organizador quer vender aulas, cursos e atividades sem depender de terceiros | O esportista amador precisa de um ambiente seguro para praticar e se organizar |
| Quem organiza | Educador físico, organizador de eventos, campeonatos, jogos (airsoft etc.) | Condomínios e clubes (academias e arenas serão estudadas depois) |
| Quem participa | Alunos e jogadores | Moradores e sócios |
| Densidade | Público de cada organizador (link na bio, WhatsApp) | Comunidade que já mora ou frequenta o espaço |
| Venda | Curta, um a um | B2B, lenta |
| Monetização | Reserva, Pix, ganhos do organizador | Em aberto. Não presumir quem paga |

Ponte entre os dois: condomínios e clubes precisam de instrutores, e os organizadores do Pro precisam de local e de público próximo. O Pro pode virar a "agenda de atividades" dentro dos espaços do Clubes.

**Fora de escopo por enquanto:** rede aberta (jogo entre desconhecidos em espaço público, ranking global, campeonatos abertos, gamificação). Só entra quando houver comunidade e histórico.

## 3. Decisões de arquitetura (fechadas)

- **Um design system para os dois produtos.** Mesmos tokens, mesmos componentes. Depois haverá ajustes sutis (acento, fundo) para diferenciar um do outro, por isso toda cor e tipografia vem de tokens semânticos, nunca de valores fixos nos componentes.
- **Um banco só** (um projeto Supabase) e **uma conta por pessoa**. O mesmo login entra nos dois produtos.
- **Fronts diferentes por produto.** Nada de copiar código entre eles: tipos, cliente Supabase, tokens e componentes de domínio ficam num núcleo compartilhado que os dois importam.
- **Mesmo banco não significa tudo visível para todos.** Os dados são separados por RLS e schemas. Um organizador do Pro não vê dados de condomínio, e um morador só vê o que o condomínio dele libera. O Clubes terá menores de idade e dados de condomínio, então o isolamento é requisito desde já.
- **Registrar tudo, expor pouco.** Presença, resultado, local e nível de cada atividade são guardados desde já, mesmo sem ranking. Esses dados não podem ser recuperados depois.
- **Preparar a porta dos Clubes sem construí-los:** `organizations` e `venues` como entidades de primeira classe, com cada atividade ligada a um local.
- **Não generalizar cedo.** Nada de reescrever tudo como uma tabela genérica de "eventos". O Pro funciona do jeito dele; só se unificam as estruturas que os dois realmente usarem, quando o Clubes existir.

## 4. Vocabulário oficial

- **Organizador:** quem cria e conduz (educador, organizador de evento, de campeonato, de jogo). "Anfitrião" é variação de tom.
- **Participante:** quem entra (aluno, jogador, atleta).
- **Atividade:** palavra guarda-chuva (aula, evento, campeonato, jogo, outros).
- Na criação, a primeira pergunta é "o que você vai organizar?", com explicação curta em tom de conversa.
- Evitar "professor/aluno/aula" em textos gerais e na tagline.
- **No banco, os nomes internos antigos continuam:** `sessions` = atividades, `role = 'professional'` = organizador, `role = 'student'` = participante. A diferenciação entre tipos é a coluna `sessions.kind` (`class`, `match`, `tournament`, `event`, `other`; rótulos em `src/lib/copy.ts`). Não renomear tabelas agora.

## 5. Identidade e design system

- Tema escuro com dourado. Tokens: `--bg #0F1115`, `--surface #171A20`, `--elevated #1F242C`, `--line #2B313B`, `--ink #F3EFE4`, `--ink-muted #A3A9B5`, `--brand #F2CE56`, `--brand-ink #0F1115`, `--accent #FFAE1A`, `--success #5CCB8A`, `--danger #FF7A7A`. Definidos em `src/index.css`.
- **Regras:** dourado = ação; âmbar = preço ou alerta; nunca texto branco sobre dourado; texto mínimo de 12px.
- **Fontes:** Chivo (títulos e preços) e Space Grotesk (corpo e rótulos). Usar a escala tipográfica (`type-display`, `type-subtitle`, `type-label`…) e os componentes de domínio, não classes soltas.
- **Motivos da marca:** linhas paralelas do "R", flecha (medidor de vagas, animação do ingresso), véu escuro sobre fotos, ícones com traço 1.75.
- **Logo:** marca-mãe Riff Sports (arqueiro), via `<Logo />` (`src/components/ui/logo.tsx`). O app se chama **Riff Pro**. Nome, domínio, tagline e og-image ficam em `src/brand.ts`.

## 6. Regras de trabalho

- **Branch + PR com preview. Nunca push direto na `main`.** Lotes pequenos.
- **Nada está "feito" sem o comando e a saída que provam.** Em todo PR, colar a saída de:
  ```bash
  npm run lint && npm run check:ds && npm run check:encoding && npm run test:db && npm run build
  ```
  O lint usa `--deny-warnings`: qualquer aviso quebra o CI. O `test:db` aplica todas as migrations num Postgres em memória (PGlite, `scripts/test-db.mjs`) e testa as regras críticas; toda migration nova precisa passar nele e, se mexer em regra de negócio, ganhar um teste ali.
- **Migrations:**
  - Nunca aplicar em nenhum banco sem antes dizer qual banco é e esperar o OK do dono do produto.
  - Não apagar coluna de dados pessoais sem confirmação.
  - Nome no padrão `AAAAMMDDHHMMSS_descricao.sql`, com timestamp maior que o da última migration existente.
  - O banco de produção (`elrgdjbprmihbmpuggdt`) recebeu as migrations à mão pelo SQL editor até 01/10/2026; confira `npx supabase migration list` antes de qualquer `db push`.
- Cores e fontes só por tokens (o `check:ds` barra cores fixas). Sem `as any` em código novo.
- Dados pessoais, documentos e menores seguem a LGPD.
- **Edições por script:** não deixar scripts avulsos (`fix-*.js`, `script*.py`) na raiz. Se usar um script para editar arquivos, preserve o fim de linha original (o checkout no Windows usa CRLF) e confira `git diff --stat` antes de commitar. Uma edição desse tipo, feita sem script versionado, já multiplicou as linhas em branco de `Login.tsx` e `ProfileEdit.tsx` (1576 e 2852 linhas, a maioria vazias).

## 7. Mapa rápido do código

- `src/pages/`: telas (rotas em `src/App.tsx`). As telas do organizador têm sufixo `Pro` (`DashboardPro`, `MySessionsPro`, `OnboardingPro`).
- `src/components/domain/`: componentes de domínio (Avatar, PriceTag, SpotsMeter, StatusPill, EmptyState…).
- `src/components/ui/`: primitivas shadcn/Radix (fora do `check:ds`).
- `src/hooks/`: acesso a dados com React Query + Supabase.
- `src/integrations/supabase/`: cliente e `types.ts` gerado.
- `src/contexts/ViewModeContext.tsx`: alternância entre modo organizador e participante.
- `supabase/migrations/`, `supabase/tests/`, `supabase/seeds/`.
- Variáveis de ambiente em `.env.local` (fora do git): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## 8. Perguntas em aberto

- Quem paga no Riff Clubes: condomínio, morador ou instrutor por comissão?
- O Clubes inclui academias e arenas, ou só condomínios e clubes?
- Quais recursos de campeonato e jogo aberto entram no Pro, e quais esperam a rede aberta?
- Critério de "pronto" do Pro (proposta: 30 organizadores ativos, 300 reservas pagas por mês, 40% de recompra, mais de 60% das reservas vindas pelo link do organizador).
- Plano de negócio (tráfego pago, influenciadores, listas de condomínios e clubes) ainda será trazido pelo dono do produto.
