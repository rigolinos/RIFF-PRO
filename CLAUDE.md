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

**Fora de escopo por enquanto:** rede aberta (jogo entre desconhecidos em espaço público, ranking global, campeonatos abertos). Só entra quando houver comunidade e histórico.

**Dentro da comunidade fechada, a competição é bem-vinda** (decisão de 05/10/2026): no Riff Clubes há elogios pós-jogo só positivos, perfil esportista, conquistas e ranking mensal **por comunidade**, com modo reservado para quem não quer aparecer. Nada disso cruza comunidades nem envolve menores.

## 3. Decisões de arquitetura (fechadas)

- **Um design system para os dois produtos.** Mesmos tokens, mesmos componentes. Depois haverá ajustes sutis (acento, fundo) para diferenciar um do outro, por isso toda cor e tipografia vem de tokens semânticos, nunca de valores fixos nos componentes.
- **Um banco só** (um projeto Supabase) e **uma conta por pessoa**. O mesmo login entra nos dois produtos.
- **Fronts diferentes por produto.** Nada de copiar código entre eles: tipos, cliente Supabase, tokens e componentes de domínio ficam no núcleo compartilhado `packages/core` (`@riff/core/...`), que os dois importam. O Clubes será `apps/clubes` neste mesmo repositório, com um único `supabase/` (um só histórico de migrations).
- **Dois apps na Google Play** (Riff Pro e Riff Clubes, downloads separados): cada um publicado na Vercel com domínio, nome, ícones e manifest próprios, empacotado como TWA (PWABuilder/Bubblewrap), com `/.well-known/assetlinks.json` próprio. Mesma conta nos dois.
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
- **No banco, os nomes internos antigos continuam:** `sessions` = atividades, `role = 'professional'` = organizador, `role = 'student'` = participante. A diferenciação entre tipos é a coluna `sessions.kind` (`class`, `match`, `tournament`, `event`, `other`; rótulos em `packages/core/src/lib/copy.ts`). Não renomear tabelas agora.

## 5. Identidade e design system

- Tema escuro com dourado. Tokens: `--bg #0F1115`, `--surface #171A20`, `--elevated #1F242C`, `--line #2B313B`, `--ink #F3EFE4`, `--ink-muted #A3A9B5`, `--brand #F2CE56`, `--brand-ink #0F1115`, `--accent #FFAE1A`, `--success #5CCB8A`, `--danger #FF7A7A`. Definidos em `packages/core/src/styles/riff.css` (importado pelo `index.css` de cada app).
- **Regras:** dourado = ação; âmbar = preço ou alerta; nunca texto branco sobre dourado; texto mínimo de 12px.
- **Fontes:** Chivo (títulos e preços) e Space Grotesk (corpo e rótulos). Usar a escala tipográfica (`type-display`, `type-subtitle`, `type-label`…) e os componentes de domínio, não classes soltas.
- **Motivos da marca:** linhas paralelas do "R", flecha (medidor de vagas, animação do ingresso), véu escuro sobre fotos, ícones com traço 1.75.
- **Logo:** marca-mãe Riff Sports (arqueiro), via `<Logo />` (`packages/core/src/ui/logo.tsx`). Os apps se chamam **Riff Pro** e **Riff Clubes**. Nome, domínio, tagline e og-image de cada um ficam em `src/brand.ts` e `apps/clubes/src/brand.ts`.

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
  - Nada de SQL à mão no banco: toda mudança de schema vira migration. `npm run check:drift` compara o banco ligado com as migrations (só leitura) e precisa sair "idênticos"; rode depois de aplicar migrations. Para SQL avulso de dados (seeds), use `npx supabase db query --linked -f arquivo`, com ensaio em `BEGIN … ROLLBACK` antes.
- Cores e fontes só por tokens (o `check:ds` barra cores fixas). Sem `as any` em código novo.
- Dados pessoais, documentos e menores seguem a LGPD.
- **Dados de exemplo** (demonstração): `supabase/seeds/demo_seed.sql` cria 6 organizadores e 20 participantes fictícios, sem login, com atividades passadas e futuras. Todo id começa com `de000000-`. **Antes de abrir para usuários reais, rodar `demo_cleanup.sql`**: avaliações fictícias não podem parecer reais (CDC art. 37). Os dois scripts são testados no `test:db`.
  ```bash
  npx supabase db query --linked -f supabase/seeds/demo_cleanup.sql
  ```
- **Documentos legais** ficam em `packages/core/src/legal/`: `documents.ts` (Riff Pro: `terms`, `privacy`, `organizer_terms`, e o mapa `LEGAL_VERSIONS` de todos) e `clubes.ts` (Riff Clubes: `clubes_terms`, `clubes_privacy`, `guardian_consent`). Cada app exige os seus: o Clubes envolve o app em `LegalProductContext` com `'clubes'` (`legal/product.ts`); o Pro usa o padrão `'pro'`. Mudou o texto? Suba a versão em `LEGAL_VERSIONS`: todo mundo terá de aceitar de novo (tela `/aceite`). Os aceites ficam em `legal_acceptances` e nunca são alterados ou apagados. O texto-base precisa de revisão jurídica antes do lançamento.
- **Edições por script:** não deixar scripts avulsos (`fix-*.js`, `script*.py`) na raiz. Se usar um script para editar arquivos, preserve o fim de linha original (o checkout no Windows usa CRLF) e confira `git diff --stat` antes de commitar. Uma edição desse tipo, feita sem script versionado, já multiplicou as linhas em branco de `Login.tsx` e `ProfileEdit.tsx` (1576 e 2852 linhas, a maioria vazias).

## 7. Mapa rápido do código

- `src/pages/`: telas (rotas em `src/App.tsx`). As telas do organizador têm sufixo `Pro` (`DashboardPro`, `MySessionsPro`, `OnboardingPro`).
- **`packages/core/`** (`@riff/core/...`): núcleo compartilhado entre Pro e Clubes. Contém design system (`styles/riff.css`), primitivas shadcn (`ui/`, fora do `check:ds`), componentes de domínio (`domain/`), cliente e tipos do Supabase (`supabase/`), sessão e conta (`hooks/useAuth`, `useProfile`, `useLegalAcceptance`), `lib/` (utils, copy, attribution), `legal/`, `layout/`, `routing/` e o logo. Veja `packages/core/README.md`.
- `src/`: o app Riff Pro (telas, navegação, `brand.ts`, hooks de atividades e reservas do Pro).
- **`apps/clubes/`**: o app Riff Clubes (telas próprias, `brand.ts`, manifest, `vercel.json` próprios), usando o mesmo núcleo e o mesmo banco. Rodar: `npm run dev:clubes` (porta 5174); build: `npm run build:clubes`. Telas de entrada (login, cadastro, senha, aceite) seguem as do Pro com o conteúdo do Clubes.
- `src/contexts/ViewModeContext.tsx`: alternância entre modo organizador e participante.
- `supabase/migrations/`, `supabase/tests/`, `supabase/seeds/`.
- **Organizações e locais (Lote 3):** todo organizador tem uma `organizations` de `kind = 'solo'` (sem nome próprio: a vitrine é o perfil). Toda atividade (`sessions`) tem `organization_id` e `venue_id`, preenchidos por trigger a partir de `location_*`; atividades no mesmo lugar compartilham o `venue`. `condo`/`club` e `visibility = 'members'` já existem para o Riff Clubes.
- **Origem das reservas e produto:** `bookings.source` (`organizer_link`, `activity_link`, `feed`, `explore`, `direct`, `other`; NULL = antes do registro existir) e `bookings.attribution` (utm, ref, domínio de origem), gravados pelo `create_booking` a partir da primeira entrada da visita (`src/lib/attribution.ts`). `product` (`pro`, `clubes`, `sports`) em `sessions` e `bookings`: o mesmo banco serve os três produtos. Critérios de "pronto" por produto: `npm run metrics` (só leitura, ignora dados de exemplo).
- **Comunidades do Riff Clubes (C2):** atividades com `product <> 'pro'` só são vistas e reservadas por membros ativos da comunidade (`organization_members`). Atividade ligada a `organizations` de `kind` `condo`/`club` vira `product = 'clubes'` por trigger, e só gestor ou instrutor cria. Entrada por convite: `create_invite` (gestor) e `join_organization` (código `XXXX-XXXX`). Criar comunidade é tarefa da equipe Riff, pelo terminal: `npx supabase db query --linked "SELECT public.admin_create_community('Nome', 'condo', 'email-do-gestor')"`.
- **Separação Pro × Clubes nas telas:** toda listagem do Riff Pro filtra `product = 'pro'` (feed, cidades, minhas reservas, minhas atividades, painel, ganhos, perfil público); as do Clubes filtram pela comunidade (`organization_id`). Consulta nova de lista precisa de um desses filtros, senão um app mostra dados do outro.
- **Agenda do Clubes (C3):** inscrição sem pagamento pelo mesmo `create_booking` (`price_per_slot = 0`, `p_source = 'other'`); cancelamento pelo fluxo de sempre (regra das 4 horas).
- **Ferramentas do gestor (C4):** o gestor (`owner`/`admin`) lê as inscrições de todas as atividades da comunidade (política `community_admin_bookings`, via `session_community()` para não recursar entre `bookings` e `sessions`). `manage_member` muda o papel ou remove (remover cancela as inscrições futuras); o dono não muda, e ninguém altera o próprio papel. `close_community_session` registra presença (`present`, `late`, `absent`, `excused`) ou "não aconteceu", por quem conduz ou pelo gestor; atividades do Pro seguem no `close_session`.
- **Lado esportista (G1):** `game_reviews` (como foi, 1 a 3; lê quem avaliou, quem organizou e o gestor) e `game_kudos` (elogios `craque`, `fair_play`, `pontual`, `bom_de_grupo`, `animou`; sem leitura direta, ninguém vê quem deu). Tudo por funções: `pending_game_reviews`, `submit_game_review` (só quem jogou ou organizou, até 7 dias depois), `community_ranking` (presença 10, organizou com 3+ presentes 15, elogio 3 com teto de 3 por jogo, avaliou 2; zera por mês) e `player_profile` (números, esportes, locais, elogios e conquistas; para os outros, só dentro de uma comunidade em comum). "Jogou" = `played_session`: inscrito sem dependente, não ausente nem justificado, evento terminado. `profiles.sports_hidden` é o modo reservado (fora do ranking e do perfil público, "Membro" em quem vai).
- **Dependentes menores (C5):** `dependents` (só nome, nascimento e parentesco; nada de saúde). Cadastro só por `add_dependent`, que grava junto o aceite de `guardian_consent`; `remove_dependent` anonimiza (nome e nascimento viram `NULL`) e cancela as inscrições futuras. Quem conduz e o gestor só veem dependentes inscritos nas atividades deles (`can_view_dependent`). Atividade aceita menores só com `sessions.minors_allowed = true` (padrão `false`), com `min_age` opcional; inscrição por `create_dependent_booking`, no nome do responsável (`student_id`) com `dependent_id`. `bookings` é única por pessoa (`dependent_id IS NULL`) e por dependente (índices parciais).
- **Presença e resultados:** `bookings.attendance_status` (`present`, `absent`, `late`, `excused`) acompanha o check-in do `close_session`; `activity_results` guarda placar/posição. Só o organizador da atividade e o próprio participante leem.
- Variáveis de ambiente em `.env.local` (fora do git): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## 8. Perguntas em aberto

- Quem paga no Riff Clubes: **ainda em aberto**, provavelmente contrato com o condomínio ou clube. A primeira versão do Clubes **não tem pagamento no app**.
- Público do Clubes: **só condomínios e clubes** na primeira versão (academias e arenas depois).
- Menores no Clubes: **sim**, como dependentes sem login cadastrados por um responsável que aceita termo específico (consentimento, LGPD art. 14). Atividades restritas à área do clube ou condomínio e só para membros. O Riff recomenda acompanhamento de maior de idade e deixa claro que a responsabilidade é do responsável e do condomínio ou clube (texto para revisão jurídica).
- Quais recursos de campeonato e jogo aberto entram no Pro, e quais esperam a rede aberta?
- Critério de "pronto" do Pro (proposta: 30 organizadores ativos, 300 reservas pagas por mês, 40% de recompra, mais de 60% das reservas vindas pelo link do organizador).
- Plano de negócio (tráfego pago, influenciadores, listas de condomínios e clubes) ainda será trazido pelo dono do produto.
