# Passagem: do Riff Pro para o Riff Clubes

Documento para começar o Riff Clubes sem perder o que foi decidido e construído no Riff Pro. Escrito em 03/10/2026. Leia junto com o `CLAUDE.md` deste repositório, que continua sendo a fonte das regras.

---

## 1. O que é o Riff Clubes

Segundo produto da marca-mãe **Riff Sports**. Detalhes no `CLAUDE.md`, seções 1 e 2.

| | Riff Pro (no ar) | Riff Clubes (a construir) |
|---|---|---|
| Dor | Organizador quer vender atividades sem intermediários | Esportista amador precisa de um ambiente seguro para praticar e se organizar |
| Quem organiza | Educador físico, organizador de eventos, jogos, campeonatos | **Condomínios e clubes** (academias e arenas: a estudar) |
| Quem participa | Alunos e jogadores | **Moradores e sócios**, inclusive **menores de idade** |
| Densidade | Público de cada organizador (link na bio) | Comunidade que já mora ou frequenta o espaço |
| Venda | Curta, um a um | **B2B, lenta** |
| Monetização | Pix direto ao organizador | **Em aberto: não presumir quem paga** |

**Ponte entre os dois:** condomínios e clubes precisam de instrutores, e organizadores do Pro precisam de local e de público. O Pro pode ser a "agenda de atividades" dentro dos espaços do Clubes.

---

## 2. Decisões fechadas que valem para o Clubes

- **Um banco só** (Supabase `elrgdjbprmihbmpuggdt`) e **uma conta por pessoa**: o mesmo login entra nos dois produtos.
- **Um design system** para os dois. Os tokens estão em `src/index.css`; depois haverá ajustes sutis de acento e fundo para diferenciar os produtos. Cor e fonte só por token.
- **Fronts diferentes por produto**, sem copiar código: tipos, cliente Supabase, tokens e componentes de domínio ficam num **núcleo compartilhado**.
- **Mesmo banco não é tudo visível para todos.** Os dados são separados por RLS e schemas:
  - um organizador do Pro não vê dados de condomínio;
  - um morador só vê o que o condomínio dele libera.
- **Menores e dados de condomínio:** o isolamento é requisito desde o primeiro dia. Para menores, a LGPD exige consentimento específico de pelo menos um dos pais ou do responsável (art. 14).
- **Registrar tudo, expor pouco.** Presença, resultado, local e nível são guardados desde já.
- **Não generalizar cedo.** Nada de uma tabela genérica de "eventos". Só se unifica o que os dois realmente usarem.

---

## 3. O que já está pronto no banco para o Clubes

Tudo está em `supabase/migrations/` (15 migrations; `npm run check:drift` confirma que o banco é idêntico a elas).

| Estrutura | Para que serve no Clubes |
|---|---|
| `organizations.kind` aceita `'condo'` e `'club'` (além de `'solo'` e `'company'`) | O condomínio ou clube é uma organização. Organizações `condo`/`club` **não são públicas**: só membros as veem. |
| `organization_members` (`role`: `owner`, `admin`, `instructor`, `member`; `status`: `active`, `invited`, `removed`) | Síndico/gestor (`owner`/`admin`), instrutores (incluindo organizadores do Pro) e moradores/sócios (`member`). |
| `public.is_org_member(org, roles[])` | Função para as regras de acesso: "a pessoa logada é membro ativo desta organização, com um destes papéis?". |
| `venues` com `organization_id` e `visibility` (`public` ou `members`) | Quadras, piscina, salão do condomínio, visíveis só para membros. |
| `sessions.organization_id` e `sessions.venue_id` | Toda atividade ligada a uma organização e a um local. |
| `product` em `sessions` e `bookings` (`pro`, `clubes`, `sports`) | Separar e medir cada produto no mesmo banco. `npm run metrics` já mostra por produto. |
| `bookings.attendance_status` e `activity_results` | Presença e resultados, só para o organizador e o próprio participante. |
| `bookings.source` / `attribution` | De onde veio cada reserva. |
| `legal_acceptances` (documento, versão, data) | Aceites imutáveis. O Clubes vai precisar de documentos próprios, inclusive o consentimento de responsável por menores. |
| `profiles.deleted_at` e `delete_user_account()` anonimizando | Exclusão de conta que preserva o histórico sem dados pessoais. |

**O que ainda não existe:**
- convite e entrada de morador no condomínio;
- validação de vínculo (unidade/apartamento, sócio);
- menores (vínculo responsável→dependente);
- schema separado para dados sensíveis de condomínio;
- regras de acesso de leitura de `sessions` e `bookings` por organização. Hoje `sessions` com status `active` é pública, o que **não pode valer** para atividades internas de condomínio.

---

## 4. Decisões a tomar no início do Clubes (antes de codar)

1. **Onde fica o código compartilhado e as migrations.** É a decisão mais importante. Hoje tudo, inclusive as migrations do banco único, está **dentro do repositório do Riff Pro**. Se o Clubes nascer num repositório separado aplicando migrations no mesmo banco, os dois históricos de migration vão entrar em conflito (o Supabase CLI exige todas as migrations aplicadas na pasta local).
   - **Opção recomendada:** transformar o repositório num **monorepo**:
     - `apps/pro` (o app atual);
     - `apps/clubes`;
     - `packages/core` (tipos, cliente Supabase, tokens, componentes de domínio);
     - `supabase/` na raiz, com **um único histórico de migrations**.
   - **Alternativa:** um repositório só para banco e núcleo, publicado como pacote e usado pelos dois apps. É mais burocrático.
2. **Atividades internas não podem ser públicas.** A política `public_sessions_read` de `sessions` precisa considerar `product`/`organization_id`: atividade de condomínio é só para membros.
3. **Dados de condomínio num schema próprio** (ex.: `clubes`), com RLS, em vez de colunas novas no `public`.
4. **Menores:** como uma conta de responsável gerencia dependentes, e qual documento de consentimento.
5. **Perguntas em aberto do `CLAUDE.md`:** quem paga no Clubes; se entram academias e arenas.

---

## 5. Como trabalhar (vale igual)

- **Branch + PR, nunca push direto na `main`.** Lotes pequenos.
- **Em todo PR, a saída de:**
  ```bash
  npm run lint && npm run check:ds && npm run check:encoding && npm run test:db && npm run build
  ```
- **Migrations:**
  - antes de aplicar, dizer **qual banco** e esperar o OK do dono do produto;
  - rodar antes com `npx supabase db push --dry-run`;
  - depois de aplicar, `npm run check:drift` precisa sair "idênticos".
- **`test:db`** (`scripts/test-db.mjs`): aplica todas as migrations num Postgres em memória (PGlite) e testa as regras críticas. Toda regra nova do Clubes (isolamento por condomínio, menores) precisa de teste ali, **começando pelo teste que prova que um morador não vê dados de outro condomínio**.
- **SQL avulso de dados:** `npx supabase db query --linked -f arquivo`, com ensaio em `BEGIN … ROLLBACK`.
- **Senhas:** o Claude não digita senhas. Para testar logado, o dono do produto entra no navegador do app e o Claude segue.

---

## 6. Estado atual do Riff Pro (03/10/2026)

- **Repositório:** `github.com/rigolinos/RIFF-PRO` (**público**). Clone local em `C:\Users\oooo0\Desktop\Riff Pro`.
- **No ar na Vercel** (projeto `riff-pro`), com deploy automático da `main`.
- **Banco:** só com dados fictícios, incluindo os **dados de exemplo** (ids `de000000-`). Remover com `supabase/seeds/demo_cleanup.sql` antes de abrir para usuários reais.
- **Pendências do Pro:**
  - revisão jurídica dos termos e preenchimento de razão social, CNPJ, e-mail e encarregado em `src/legal/documents.ts`;
  - domínio final (`riff.pro` está fixo em `src/brand.ts` e em textos);
  - URLs de redirecionamento no Supabase Auth;
  - proteção contra senhas vazadas;
  - lembretes automáticos e atividades recorrentes.

---

## 7. Como começar a nova conversa

1. Abra uma nova conversa no Claude Code **na pasta do Riff Pro** (`C:\Users\oooo0\Desktop\Riff Pro`), porque o banco, as migrations e o núcleo estão lá. Ou, se já houver uma pasta para o Clubes, adicione a do Riff Pro à conversa.
2. Primeira mensagem sugerida:
   > Vamos começar o Riff Clubes. Leia `CLAUDE.md` e `docs/passagem-riff-clubes.md`. Antes de qualquer código, me proponha como organizar o código compartilhado e as migrations (seção 4, item 1) e o desenho de isolamento por condomínio, com o primeiro teste no `test:db`.
