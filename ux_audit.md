<USER_REQUEST>
quero agora uma apuração sobre ui ux, seguindo a mesma profisisonalidade que temos até agora. Pedi auxilio a um profissional e ele fez esse documento para mim quero que leia avalie e traga oque acha sobre as mudanças e plano de implementação. nao codar nada 

# Riff Pro — Auditoria de Design, UI e UX + Direção de Evolução

**Produto:** marketplace para profissionais que vendem aulas, turmas e cursos diretamente a alunos (React 19 · Vite · Tailwind 4 · shadcn/Radix · Framer Motion · Supabase).
**Documento irmão:** `RIFF-PRO_Auditoria_e_Roadmap.md` (segurança, banco e arquitetura). Este aqui cobre **design, interface, experiência, movimento e conteúdo**.
**Data da análise:** 29/09/2026

> **Escopo e limites.** A análise foi feita **lendo o código** (CSS global, layout, componentes, páginas de Landing, Login/Signup, Feed, Explore, SessionCard, SessionDetails, Checkout, MyBookings, ProfessionalProfile, DashboardPro, SessionForm, BottomNav, ModeBanner e skeletons) e rodando contagens de padrões no restante. **Não renderizei telas nem testei em aparelho.** Tudo que depende de "como aparece" está marcado como *provável* e deve ser confirmado em celular real. Números de contraste foram calculados a partir dos tokens do `index.css`.

---

## 1. Resumo executivo

### 1.1 Veredito em uma frase

O Riff Pro tem uma **base visual coesa e bem intencionada** (dark + esmeralda, mobile-first, drawer de checkout, prévia ao vivo na criação de aula), mas hoje parece um **protótipo polido, não um produto de marca**: não tem foto nem identidade própria, tem **conteúdo fictício apresentado como fato**, navegação com colisões e um design system que existe só pela metade.

### 1.2 Scorecard (avaliação qualitativa, 1–10)

| Área | Nota | Leitura rápida |
|---|---|---|
| Identidade visual / marca | **5** | Paleta coerente, mas logo genérico (haltere do Lucide), zero fotografia, visual "template dark + verde". |
| Design system e consistência | **4** | 52 `<button>` crus contra 17 `<Button>`; tokens definidos e ignorados (~288 cores hardcoded). |
| Navegação e arquitetura de informação | **4** | Card do feed não abre detalhes; BottomNav aparece onde não deveria; colisões de camadas. |
| Fluxos e conversão | **5** | Reserva curta (bom), mas sem foto, sem prova social real e com pós-pagamento manual. |
| Confiança e conteúdo | **3** | "98% presença", nota 5.0 padrão, selo de verificação sem verificação, textos iguais para todos. |
| Acessibilidade | **4** | Contraste dark bom; mas 1 `aria-label`, labels sem `htmlFor`, 34 textos ≤ 11px, rótulos do menu escondidos no toque. |
| Motion e microinterações | **6** | Boa intenção (indicador animado, drawer, entradas), sem sistema e sem `reduced-motion`. |
| Responsividade / PWA | **5** | Mobile-first de verdade, mas `viewport-fit`, `pt-safe`, `dvh` e manifest faltam; desktop é uma coluna de 480px. |
| Copy e tom | **5** | Direto e brasileiro, mas mistura "aula/turma/sessão", promete demais e tem jargão de growth. |
| Performance percebida | **5** | Skeletons existem, mas não casam com o card; imagens sem lazy/dimensões; fonte declarada e não carregada. |

### 1.3 O que já está bom (preservar)

- **Contraste do tema escuro é sólido:** texto secundário sobre o fundo ≈ **5,7:1**, esmeralda-400 ≈ **9,6:1**, preto sobre esmeralda-500 ≈ **8,3:1** (todos acima de 4,5:1).
- **Mobile-first real:** `Drawer` (vaul) para checkout, alvos de toque de 40–56px na maioria dos botões, `tabular-nums` em preços e horários.
- **Barra de navegação "pílula"** com indicador animado via `layoutId` e FAB central para criar aula.
- **Prévia ao vivo do card na criação de aula** (`SessionForm`): é o melhor detalhe de UX do app. Manter e ampliar.
- **Barra de progresso de vagas** no card e *badge* de escassez com estado "Lotada".
- **Link público do profissional** em destaque no dashboard (a ação de crescimento mais importante está no lugar certo).
- **WhatsApp como canal** (natural para o público brasileiro) e botão de copiar Pix.
- **Estados vazios com CTA** já existem em várias telas.

### 1.4 Os 8 problemas que mais custam confiança ou conversão

| # | Problema | Onde |
|---|---|---|
| 1 | **O link público compartilhado está quebrado.** O código monta a URL como texto literal: `"https://riff.pro/@ + publicSlug + "`. Quem toca em "Copiar" ou "Compartilhar" leva uma URL inválida. | `DashboardPro.tsx` |
| 2 | **Conteúdo fictício exibido como fato** no perfil público: "98% Presença" fixo, lista "Na aula você tem: equipamentos higienizados / acompanhamento biomecânico" igual para todos, bio e especialidades padrão, nota "5.0" quando não há avaliações, "Ocupação: Alta" sem cálculo. | `ProfessionalProfile.tsx`, `Explore.tsx`, `DashboardPro.tsx` |
| 3 | **Selo de verificação sem verificação.** O escudo verde aparece se `credential_number` existir (texto digitado pelo próprio profissional); a Landing promete "perfil verificado (CREF, CREFITO)". | `ProfessionalProfile.tsx`, `Landing.tsx` |
| 4 | **Cards do feed não abrem a página da aula.** `SessionCard` só tem o botão "Garantir Vaga" (abre checkout). `/session/:id` só é alcançável por link externo. Não há como ler descrição, local ou "o que levar" antes de pagar. | `SessionCard.tsx`, `Feed.tsx` |
| 5 | **Produto sem imagem.** O schema tem `cover_image_url`, mas nenhuma tela usa ou permite enviar. Cards, detalhes e perfil são só texto e gradiente. Em marketplace de experiências, isso pesa muito na conversão. | schema × todas as telas |
| 6 | **A barra inferior colide com o botão principal.** A `BottomNav` (fixa, z-50) aparece também em `/session/:id`, `/pro/:slug`, `/forgot-password`, `/reset-password` e 404 (*provável* sobreposição com a barra "Garantir Vaga" da página de detalhes). Para visitantes anônimos ela mostra abas que redirecionam ao login. | `BottomNav.tsx`, `SessionDetails.tsx` |
| 7 | **Textos corrompidos (mojibake)** em Feed, Login, Dashboard, MySessionsPro, ProfileEdit, Signup: "OlÃ¡", "ðŸ”¥". É a primeira coisa que um usuário vê. | vários |
| 8 | **Promessa falsa no erro global:** "Nossa equipe já foi notificada" — o código só faz `console.error`. | `GlobalErrorBoundary.tsx` |

---

## 2. Diagnóstico detalhado

Formato: **ID · onde → problema → impacto → recomendação**. Prioridade: **D0** corrigir agora (bug/confiança) · **D1** fundação · **D2** telas centrais · **D3** diferenciação.

### 2.1 Bugs e conteúdo que quebram confiança (D0)

| ID | Onde | Problema | Recomendação |
|---|---|---|---|
| UX-01 | `DashboardPro.tsx` | `publicUrl` é uma string literal, não template. Copiar e compartilhar entregam URL inválida. Domínio `riff.pro` está fixo no código. | `` `${import.meta.env.VITE_PUBLIC_URL}/@${publicSlug}` `` (env por ambiente). Testar o botão em e2e. |
| UX-02 | `ProfessionalProfile.tsx` | "98% Presença" é constante; "Na aula você tem…" é igual para todos; `specialties`, `bio` e nota têm *fallback* inventado. | Mostrar **só o que existe**: sem dado, esconder o bloco ou mostrar "Novo na Riff". Trocar "Na aula você tem" por campo real do profissional (`what_to_bring`/"incluso"), com editor. Presença só quando calculada (depois do fluxo de encerramento de aula). |
| UX-03 | `Explore.tsx`, `ProfessionalProfile.tsx`, `SessionCard.tsx` | Sem avaliações aparece "5.0" (Explore/Perfil) e "Novo" (Card). Inconsistente e enganoso. | Regra única: 0 avaliações → selo **"Novo"**; a partir de N avaliações mostra a média. Um componente `RatingBadge`. |
| UX-04 | `ProfessionalProfile.tsx`, `Landing.tsx` | Selo de verificação por `credential_number` preenchido. | Só exibir "Registro verificado" quando `credential_verified = true` (concedido pelo backend, ver auditoria técnica). Antes disso, exibir o registro como "informado pelo profissional" em estilo neutro, sem escudo. |
| UX-05 | `DashboardPro.tsx` | "Receita (Mês)" mostra a receita total; "Ocupação Méd." mostra "Alta"/"0%". A taxa real é calculada no código com "10 vagas" fictícias e não é usada. | Rotular corretamente ("Receita total" ou filtrar mês de verdade), calcular ocupação por `current_participants / max_participants`, e mostrar variação vs. período anterior. |
| UX-06 | `GlobalErrorBoundary.tsx` | Promete notificação à equipe sem enviar nada. | Integrar Sentry (ou similar) e mostrar um código de erro copiável; ou remover a frase. |
| UX-07 | 6 arquivos | Mojibake e BOM. | Regravar em UTF-8 sem BOM, `.editorconfig`, regra de CI para acusar `Ã` e `ð` em `src/`. |
| UX-08 | `index.html` | `lang="en"`, `<title>riff-profissionais</title>`, sem `theme-color`, sem descrição, sem ícones de app. | Título e descrição em pt-BR, `theme-color`, `apple-touch-icon`, manifest (ver §2.9). |
| UX-09 | `SessionForm.tsx` | Textos com afirmações sem base: "Títulos com o benefício final vendem 3x mais", "Turmas exclusivas geram escassez e esgotam rápido". | Remover números inventados. Dicas de copy válidas, sem estatística falsa. |

### 2.2 Navegação e arquitetura de informação

| ID | Onde | Problema | Recomendação |
|---|---|---|---|
| NAV-01 | `SessionCard.tsx`, `Feed.tsx`, `ProfessionalProfile.tsx` | Card não navega para `/session/:id`. | Card inteiro clicável (área principal → detalhes; botão → reservar direto). Prefetch dos dados da aula ao pressionar/entrar em viewport. |
| NAV-02 | `BottomNav.tsx` | Rotas ocultas por lista fixa (`/`, `/login`, `/signup`, `/onboarding*`). `viewMode` começa em `'student'`, então a barra aparece para anônimos e em telas de recuperação de senha e 404. | Renderizar a barra **só com usuário logado** e em rotas de "app" (whitelist em vez de blacklist). |
| NAV-03 | `BottomNav.tsx` | Rótulos das abas inativas têm `opacity-0` e só aparecem no `hover`; no toque não existe hover. Vira menu só de ícones. Sem `aria-current`, sem nome acessível. | Rótulo sempre visível (10–11px é o mínimo aceitável; melhor 12px), `aria-current="page"`, `NavLink`. |
| NAV-04 | `BottomNav.tsx` + `PageContainer.tsx` | Espaço duplicado: `<div class="h-[80px]">` na barra **e** `pb-24` no container. | Uma única fonte: variável CSS `--bottom-nav-h` aplicada no container. |
| NAV-05 | `ModeBanner.tsx` | Faixa `fixed top-0 z-[100]` de largura total: cobre o `Header` (sticky, z-40) e, no desktop, vaza para fora da coluna de 480px. | Empurrar o conteúdo (`padding-top`) enquanto a faixa existe, limitar à largura do app, ou trocar por um seletor de modo no perfil. |
| NAV-06 | `DashboardPro.tsx` | `ModeSwitch` é um componente definido *dentro* do componente da página (remonta a cada render). | Extrair para `components/layout/ModeSwitch.tsx` e colocar no menu de perfil. |
| NAV-07 | `SessionDetails.tsx`, `ProfessionalProfile.tsx`, `Login.tsx` | Cada página monta seu próprio cabeçalho/voltar, sem `PageContainer`. Padrões diferentes (voltar flutuante, voltar em linha). | Um `AppShell` com variantes: `tab` (com barra), `detail` (imagem no topo e voltar/compartilhar), `flow` (checkout/formulários, sem barra). |
| NAV-08 | `Feed.tsx` | O botão de busca (lupa) não tem ação; `Explore` existe separado e só busca profissionais por nome. | Busca unificada: aulas + profissionais + modalidades, com filtros (ver §4.5). |
| NAV-09 | `Feed`/`Explore` | Exigem login. Quem chega por link do Instagram não pode explorar. | Feed e Explore públicos; login só na hora de reservar (o `redirect=` já existe no Login). |
| NAV-10 | `App.tsx` | Nenhuma transição entre rotas; troca seca. | Transições de página curtas e *shared element* card → detalhe (ver §3.7). |
| NAV-11 | Favoritos | A tabela `favorites` existe e não há UI. | Coração no card e no perfil; aba "Salvos". |

### 2.3 Identidade visual, cor e tipografia

| ID | Onde | Problema | Recomendação |
|---|---|---|---|
| VIS-01 | `Landing.tsx`, `Login.tsx` | Logotipo é o ícone `Dumbbell` do Lucide num quadrado verde. Reconhecível como template; também limita a marca ao "fitness" enquanto o produto vende aulas e cursos de qualquer tipo. | Wordmark próprio ("Riff") e um símbolo simples derivado do nome/da ideia. Deixar de usar o haltere como marca. |
| VIS-02 | `index.css` | Fonte declarada (`'Inter'`) **nunca é carregada** (sem `@import`, `<link>` nem `@font-face`). Cai em `system-ui`; a tipografia varia por aparelho. | Carregar a fonte (auto-hospedada, variável, `font-display: swap`) e definir escala tipográfica. |
| VIS-03 | vários | 34 ocorrências de `text-[9px]/[10px]/[11px]`, 38 `uppercase` (rótulos, selos, seções). Ilegível ao sol e cansativo em bloco. | Tamanho mínimo 12px para texto informativo; reduzir CAPS a rótulos curtos e realmente categóricos. |
| VIS-04 | `index.css` × `PageContainer.tsx` | Dois fundos diferentes: `--background` ≈ `#02161C` e `bg-[#010E12]` no container, além de `bg-background` em páginas sem container (Login, Landing, Detalhes). Troca sutil de tom entre telas. | Um único token `--bg`. Nada de hex no JSX. |
| VIS-05 | ~288 usos | `emerald-500/400`, `white/5`, `border-white/10`, `text-black` direto nos componentes; os tokens `--riffpro-*` quase não são usados. | Tokens semânticos (§4.3) e regra de lint. |
| VIS-06 | `Landing.tsx` | Quatro cores de destaque nos ícones (verde, azul, âmbar, roxo) que não existem em nenhum outro lugar; rosa no Instagram; verde WhatsApp. | Paleta funcional: 1 cor de marca, 1 de destaque, semânticas (sucesso/alerta/erro). Cores de terceiros só em botões de terceiros. |
| VIS-07 | Tema | 100% escuro e fixo (`Sonner theme="dark"`). Aluno reserva **ao ar livre, à luz do dia**, onde tema escuro perde legibilidade. | Suportar claro e escuro por tokens; considerar **claro como padrão** no fluxo do aluno (§4.1). |
| VIS-08 | `glass-card` | "Glassmorphism" em tudo (fundo 3% branco, blur, borda 6%). Em fundo escuro plano quase não há profundidade; em tema claro não existe equivalente. | Sistema de elevação com 3 níveis (base, superfície, elevado) definidos por token. |
| VIS-09 | `Landing.tsx` | Título com **uma frase** em gradiente ("sem intermediários") e cartões idênticos em lista. É o padrão mais comum de landing de template. | Ver §4.5 (Landing). |
| VIS-10 | Ícones/emoji | Emojis de categoria na interface (🔥 Todas, 📅, 🕵️♂️) misturados com ícones Lucide. Renderizam diferente em cada sistema. | Ícones de modalidade próprios (SVG) ou fotos; emoji só em conteúdo do usuário. |

### 2.4 Design system e componentes

| ID | Onde | Problema | Recomendação |
|---|---|---|---|
| DS-01 | todo o app | **52** `<button>` crus vs. **17** `<Button>`. O CTA verde com `glow` é copiado à mão em Landing, Login, Signup, Card, Checkout, Dashboard, Detalhes, Formulário. | Variantes no `Button` (`cta`, `soft`, `danger-soft`, `whatsapp`) e tamanhos (`xl`). Proibir `<button>` cru com lint. |
| DS-02 | `Login`, `Signup`, `ForgotPassword`, `ResetPassword` | Inputs crus repetidos, sem `Input`/`Label`/`Form` do shadcn; `<label>` sem `htmlFor`; botão de olho sem nome acessível. | Usar `Form` + `Input` + `Label` com validação Zod inline e `aria-invalid`/`aria-describedby`. |
| DS-03 | `SessionForm.tsx` | `ScrollArea` redefinido localmente (sombreia o do `ui/`). | Remover. |
| DS-04 | `App.tsx` | Dois sistemas de toast (shadcn `Toaster` e `sonner`). | Ficar só com `sonner`. |
| DS-05 | vários | Falta biblioteca de **componentes do domínio**: `StatusPill`, `RatingBadge`, `PriceTag`, `SpotsMeter`, `Avatar` com fallback, `EmptyState`, `ErrorState`, `StatCard`, `SectionHeader`, `ListRow`, `ConfirmDialog`. Hoje cada tela reimplementa (ex.: status de reserva com `if/else` de cores na `MyBookings`). | Criar em `components/domain/` e documentar em Storybook. |
| DS-06 | `SessionCardSkeleton.tsx` | O esqueleto tem outra estrutura e altura (240px) que o card real → *layout shift* ao carregar. | Skeleton derivado do mesmo layout do card (mesmas alturas). |
| DS-07 | `SessionCard`, `MyBookings`, etc. | Componentes recebem `any`; sem *stories*/testes visuais. | Tipos derivados do Supabase; Storybook + testes de regressão visual. |
| DS-08 | `tailwind.config.ts` | Configuração estilo v3 convivendo com Tailwind v4 (`@theme` em CSS). Provável configuração morta. | Migrar tudo para `@theme`; apagar o arquivo antigo se não for usado. |

### 2.5 Telas — o que melhorar em cada uma

**Landing** (`Landing.tsx`)
- Sem imagem, sem demonstração do produto, sem prova social; a promessa ("perfil verificado") ainda não é cumprida.
- Posiciona como "carreira esportiva", mas o produto serve qualquer aula ou curso.
- **Ideias:** hero que já *mostre o produto* (o cartão de aula real e a página `/@nome` de um profissional-exemplo); demonstração em 3 passos com telas reais; bloco "quanto você recebe" (calculadora simples de receita por turma); duas entradas claras (aluno/profissional) sem competir; depoimentos e números **reais** quando existirem; rodapé com termos, privacidade e contato.

**Login / Signup**
- Estrutura limpa e mensagens de estado úteis. Falta: login social (Google/Apple), *magic link* por e-mail (menos fricção que senha), indicador de força da senha, `autocomplete` completo no cadastro, e o seletor Profissional/Aluno como **grupo de rádio acessível** (hoje são dois botões).
- Cadastro do profissional pede tudo depois (onboarding). Isso é bom; transformar em **checklist de progresso** ("perfil 60%: falta foto, Pix, primeira aula").

**Feed e Card**
- Card: sem foto de capa; avatar de 56px carrega a identidade; metadados (nível, duração, tipo de local, distância) existem no schema e não aparecem; "1 VAGAS" (plural incorreto) e CAPS + `animate-pulse` infinito no selo de escassez.
- Feed: chips de categoria com emoji, sem contagem; sem ordenar/filtrar por data, preço, distância; animação de entrada com atraso `index * 0.05` cresce sem limite (o 20º item demora ~1s para aparecer).
- **Ideias:** ver §4.5 (card fotográfico, filtros em *bottom sheet*, agrupamento por dia: "Hoje", "Amanhã", "Este fim de semana"), *pull to refresh*, "perto de você".

**Detalhes da aula** (`SessionDetails.tsx`)
- Topo é um bloco esmeralda chapado; ignora `cover_image_url`. Não mostra nível, "o que levar" separado, mapa, política de cancelamento, avaliações do profissional nem link para o perfil. A imagem de fallback vem de `ui-avatars.com` (terceiro, envia o nome do profissional).
- Barra de reserva inferior colide com a `BottomNav`.
- `onSuccess` faz `window.location.reload()`.
- **Ideias:** galeria/capa; bloco do profissional com nota e "Ver perfil"; seção "Como funciona a reserva e o cancelamento"; mapa/rota; compartilhar com imagem gerada; aulas semelhantes do mesmo profissional.

**Checkout** (`CheckoutModal.tsx`)
- Drawer bem resolvido. Problemas: um único botão gera a reserva **antes** de mostrar o Pix; o Pix é chave copiada; o aluno precisa mandar comprovante no WhatsApp; sem tempo limite visível; sem QR.
- **Ideias:** passos claros (Resumo → Pagar → Confirmado); Pix "copia e cola" e QR com valor fixo; contagem regressiva da reserva; confirmação automática assim que o pagamento cair; tela final de sucesso como **ingresso** (§4.5).

**Minhas Reservas** (`MyBookings.tsx`)
- Duas abas (Próximas/Histórico), status por texto em CAPS 10px. Estado "Concluída" é **inferido no cliente** pela data.
- **Ideias:** próxima aula em destaque com contagem regressiva e ações rápidas (mapa, calendário, avisar atraso), ingresso com QR, status com ícone + texto (não só cor), "Reservar de novo".

**Perfil público do profissional** (`ProfessionalProfile.tsx`)
- É a "loja" do profissional e a página mais importante para crescimento; hoje tem conteúdo fictício, sem capa, com carrossel horizontal de turmas (esconde oferta), e `Helmet` só funciona no navegador (prévias de WhatsApp/Instagram enxergam pouco; `og:image` cai num `via.placeholder.com` externo).
- **Ideias:** capa + avatar + frase de posicionamento; barra fixa "Reservar"/"Falar com o profissional"; agenda semanal em lista (não carrossel); galeria de fotos; avaliações com filtros; FAQ; modo de edição "ver como aluno"; página com **OG dinâmico** por SSR/pré-render (imagem com nome, modalidade, próxima aula).

**Dashboard do profissional**
- Bom começo (link público no topo). Problemas: link quebrado (UX-01), KPIs falsos (UX-05), pouca ação.
- **Ideias:** "Hoje" (aulas do dia e o que fazer agora: confirmar pagamentos, encerrar aula), *checklist* de ativação, gráfico de receita com variação, alunos em risco (faltaram/deixaram de vir), botão "Repetir aula da semana passada", atalhos de WhatsApp.

**Criação de aula** (`SessionForm.tsx`)
- Wizard em 3 passos com prévia ao vivo: ótimo. Mas: sem foto, sem nível/tipo de local (já no schema), sem recorrência, sem "o que levar" separado, `input type=date/time` nativos sem sugestões, barra de ações `absolute` que sofre com o teclado do celular. No desktop, o layout de duas colunas (`lg:`) fica **dentro de `#root` com 480px** e o painel de prévia não ganha espaço (*provável*).
- **Ideias:** duplicar/recorrência ("toda terça e quinta 7h por 8 semanas"), *templates* por modalidade, sugestões de horário, foto com recorte, validação inline, salvar rascunho, e prévia também da **página de detalhes**.

**Minhas aulas / presença (profissional)**
- Cancelar e duplicar usam `window.confirm` e `reload()`; presença/pagamento são ações soltas.
- **Ideias:** tela "Encerrar aula" (lista com presente/faltou/pago), ações em massa, avisos por WhatsApp com modelos prontos, calendário semanal.

**Ganhos**
- Título muda entre "Meus Ganhos" e "Financeiro". Valores usam `price_per_slot` da sessão, não o valor da reserva.
- **Ideias:** extrato com filtros, a receber × recebido, taxas, exportar CSV/recibo, próximos repasses.

### 2.6 Motion e efeitos (estado atual)

| Observação | Onde | Avaliação |
|---|---|---|
| Framer Motion em 12 arquivos, sem padrão | vários | Bom uso pontual; falta sistema (durações, curvas, *springs*). |
| Indicador da BottomNav com `layoutId` e mola | `BottomNav.tsx` | Ótimo, manter. |
| Entrada do feed com atraso crescente | `Feed.tsx` | Limitar o atraso (ex.: máx. 6 itens) e animar só a primeira carga. |
| `animate-pulse` infinito no selo de escassez | `SessionCard.tsx` | Movimento contínuo chama atenção demais e cansa; usar só quando o número mudar. |
| Brilho (`glow-emerald`) em quase todo CTA | vários | O brilho perde valor quando é padrão. Reservar para **uma** ação por tela. |
| Nenhum tratamento de `prefers-reduced-motion` | app inteiro | Acessibilidade e conforto: envolver o app em `<MotionConfig reducedMotion="user">`. |
| Sem transição entre páginas nem *shared element* | rotas | Maior oportunidade de "sensação de app". |
| Feedback de ação: spinners genéricos (`Loader2`) | vários | Trocar por *optimistic UI* e microconfirmações (§3.7). |

### 2.7 Acessibilidade

| ID | Problema | Recomendação |
|---|---|---|
| A11Y-01 | Só **1** `aria-label` fora de `ui/`; botões só com ícone (busca, olho de senha, compartilhar, voltar em várias telas) sem nome. | Nome acessível em todo botão de ícone; lint `jsx-a11y`. |
| A11Y-02 | `<label>` sem `htmlFor` nas telas de autenticação. | Usar `Label` + `Input` com `id`. |
| A11Y-03 | Rótulos do menu ocultos no toque (NAV-03). | Sempre visíveis. |
| A11Y-04 | 34 textos ≤ 11px (9–11px), muitos em CAPS. | Mínimo 12px; hierarquia por peso/cor, não por tamanho mínimo. |
| A11Y-05 | Status comunicado por cor + texto em 10px; ícones sem texto alternativo. | Ícone + texto claro; `role="status"`/`aria-live` para toasts e resultados. |
| A11Y-06 | Sem `prefers-reduced-motion`. | `MotionConfig` + media query. |
| A11Y-07 | `img` sem `alt` (avatares de avaliações) e sem `loading="lazy"` (0 usos), sem `width/height`. | `alt` correto, `loading="lazy"`, dimensões para evitar salto. |
| A11Y-08 | Seleção de papel e chips de categoria são botões soltos. | `role="radiogroup"`/`radio` e `aria-pressed`. |
| A11Y-09 | 72 estilos `hover:` dependem de mouse. | Garantir equivalente `active:`/`focus-visible:` e nunca esconder informação atrás de hover. |
| A11Y-10 | Foco visível inconsistente nos elementos crus. | `focus-visible:ring` padrão em todos (vem pronto no `Button`). |

Ponto positivo confirmado por cálculo: o contraste do tema escuro atual passa em AA (texto secundário ≈ 5,7:1). Ao criar o tema claro, **recalcular** todos os pares.

### 2.8 Responsividade e comportamento "de app"

| ID | Problema | Recomendação |
|---|---|---|
| RES-01 | `<meta viewport>` sem `viewport-fit=cover`: no iPhone, `env(safe-area-inset-*)` devolve 0, então `pb-safe` não protege contra a barra home. | Adicionar `viewport-fit=cover`. |
| RES-02 | `pt-safe` é usado em `PageContainer` mas **não está definido** no CSS. | Definir junto de `pb-safe`. |
| RES-03 | `min-h-screen` (100vh) em 20 lugares: no celular a barra do navegador faz o conteúdo "pular". | Usar `min-h-dvh`. |
| RES-04 | `#root` limitado a 480px em qualquer tela: no desktop vira uma faixa estreita com fundo vazio; fixos (`ModeBanner`) escapam da coluna. | Definir a experiência desktop (§4.5) — ao menos fundo/moldura decorativos e fixos limitados à coluna; ideal: layout responsivo de verdade para o painel do profissional. |
| RES-05 | Sem `manifest.webmanifest`, ícones, `theme-color`, tela de abertura. | Transformar em PWA instalável (ícone na tela inicial, sem barra do navegador). |
| RES-06 | Barra de ações do formulário fixa (`absolute bottom-0`) pode ficar sob o teclado. | Usar `position: sticky` + `visualViewport`/`dvh` e testar em iOS e Android. |
| RES-07 | Sem estado offline/erro de rede nas listas (o Feed não tem estado de erro). | `ErrorState` com "Tentar de novo" e detecção de offline. |

### 2.9 Conteúdo, copy e tom

| ID | Observação | Recomendação |
|---|---|---|
| COPY-01 | Vocabulário instável: "aula", "turma", "sessão", "vaga", "reserva", "garantir vaga". | Glossário: **Aula** (evento), **Turma** (grupo recorrente), **Curso** (série com matrícula), **Reservar/Reserva**. |
| COPY-02 | "Garantir Vaga" no botão e "Reserva" nas listas; toast fala outra coisa. | Um verbo por ação em todo o fluxo: **Reservar** → "Reserva confirmada". |
| COPY-03 | "Título Magnético", "Ideias que convertem", "leads": jargão de marketing dentro da ferramenta. | Falar a língua do profissional: "Título da aula", "Sugestões de título". |
| COPY-04 | Erros genéricos ("Erro ao salvar. Tente novamente."). | Dizer o que aconteceu e o que fazer ("O horário já passou. Escolha uma data futura."). |
| COPY-05 | "1 VAGAS", datas com `capitalize` manual, moeda com `toFixed(2).replace('.', ',')`. | `Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })`, `Intl.PluralRules`, `Intl.DateTimeFormat`. |
| COPY-06 | Promessas absolutas ("sem intermediários", "receba pagamento direto") enquanto o app é o intermediário do agendamento. | Ser preciso: "Sem taxa de academia. Você define preço e horário." |
| COPY-07 | Sem termos/privacidade/contato visíveis. | Rodapé e links nas telas de cadastro (também exigência da LGPD). |

### 2.10 Performance percebida

- **Fonte declarada e não carregada** (VIS-02).
- **Imagens sem `loading="lazy"`, sem dimensões e sem *placeholder*** (7 `<img>` fora de `ui/`, nenhum lazy).
- **Dependência externa para avatar:** `ui-avatars.com`. Trocar por avatar de iniciais gerado localmente.
- **Skeleton diferente do conteúdo** (DS-06) e spinners em outras telas: escolher um padrão (esqueleto) para listas.
- Sem *prefetch* dos detalhes ao pressionar um card; sem *code-splitting* por rota; `framer-motion` no pacote inicial.
- Meta de partida: **LCP < 2,5 s** e **CLS < 0,1** em 4G médio; medir com Lighthouse/WebPageTest e acompanhar com Web Vitals reais.

---

## 3. Direção de design proposta

### 3.1 Princípios

1. **Confiança primeiro.** Nada de dado inventado. Vazio honesto ("Novo na Riff") vale mais que número falso.
2. **Foto primeiro.** Experiência de aula se vende com imagem: capa da aula, foto do profissional, galeria.
3. **Reservar em dois toques.** Do card à reserva paga, o mínimo de passos, com o pagamento sendo confirmado sozinho.
4. **O profissional é a marca.** A Riff é a "loja"; o nome e o rosto do profissional lideram, a plataforma acompanha.
5. **Feito para o sol e para o polegar.** Legível ao ar livre, alcançável com uma mão, tolerante a rede ruim.
6. **Um movimento com propósito por tela.** Animação responde a ação do usuário ou mostra o que mudou; não decora.

### 3.2 Três direções visuais (para escolher com o time)

O visual atual (fundo escuro quase preto com um verde brilhante de destaque) é uma das combinações mais comuns hoje; funciona, mas não é ownable. Sugestões:

**A · "Noite Esmeralda", evolução do atual.** Mantém o dark, mas com identidade: fundos em verde-petróleo profundo, um verde de marca mais escuro e um único destaque quente para ações (evita "verde em tudo"). Baixo esforço, menor mudança de percepção.
- Base: `#04141A` (fundo) · `#0B2129` (superfície) · `#13303A` (elevado)
- Marca: `#10B981` (mantida) · Destaque: `#FFB020` (âmbar, preço/urgência)
- Tipografia: títulos em grotesca com personalidade (ex.: *Bricolage Grotesque*), texto em *Inter* ou *DM Sans*

**B · "Luz do Dia" (recomendada para o aluno).** Tema claro, fotográfico, com verde profundo como marca e um amarelo-sol para destaques. Pensado para uso ao ar livre em celular. O painel do profissional pode oferecer alternância claro/escuro.
- Base: `#F5F8F7` (fundo) · `#FFFFFF` (superfície) · `#0D1F1B` (texto)
- Marca: `#0B6B4F` (verde profundo) · Destaque: `#FFC533` (sol) · Sucesso: `#12A150`
- Tipografia: títulos *Bricolage Grotesque* ou *Sora* (peso 600–700), texto *Inter*/*DM Sans*
- Fotos com cantos generosos, sombras suaves, muito ar

**C · "Quadra".** Cores fortes de esporte (azul-quadra e laranja-saibro) em blocos, ousada e memorável, menos "wellness", mais "esporte/energia". Maior risco e maior diferenciação.
- Base: `#F4F6FA` · `#0F1B3D` (tinta) · Marca `#1F4FD8` · Destaque `#E4572E`

**Recomendação:** B como padrão do aluno e do perfil público (onde a conversão acontece), com **modo escuro completo** por tokens; o painel do profissional herda a mesma paleta. Isso resolve legibilidade ao ar livre, dá espaço para fotografia e diferencia do "dark + verde" comum. **Validar todos os pares de cor com ferramenta de contraste antes de fixar.**

### 3.3 Tokens (Tailwind v4, pronto para adaptar)

```css
/* src/styles/tokens.css — fonte única de verdade */
@theme {
  /* cor semântica (nunca usar emerald-*, white/5 ou hex nos componentes) */
  --color-bg:          var(--bg);
  --color-surface:     var(--surface);
  --color-elevated:    var(--elevated);
  --color-ink:         var(--ink);
  --color-ink-muted:   var(--ink-muted);
  --color-line:        var(--line);
  --color-brand:       var(--brand);
  --color-brand-ink:   var(--brand-ink);   /* texto sobre a marca */
  --color-accent:      var(--accent);
  --color-success:     var(--success);
  --color-warning:     var(--warning);
  --color-danger:      var(--danger);

  /* raio por papel, não um raio para tudo */
  --radius-control: 12px;   /* botões, inputs */
  --radius-card:    20px;
  --radius-sheet:   28px;

  /* sombra por nível */
  --shadow-1: 0 1px 2px rgb(0 0 0 / .06), 0 1px 1px rgb(0 0 0 / .04);
  --shadow-2: 0 8px 24px rgb(0 0 0 / .10);
  --shadow-cta: 0 8px 24px color-mix(in oklab, var(--brand) 35%, transparent);

  /* tipografia */
  --font-display: "Bricolage Grotesque Variable", system-ui, sans-serif;
  --font-sans:    "Inter Variable", system-ui, sans-serif;
  --text-xs: 0.75rem;  --text-sm: 0.875rem; --text-base: 1rem;
  --text-lg: 1.125rem; --text-xl: 1.375rem; --text-2xl: 1.75rem; --text-3xl: 2.25rem;

  /* movimento */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-fast: 120ms; --dur-base: 200ms; --dur-slow: 320ms; --dur-hero: 480ms;

  /* layout */
  --bottom-nav-h: 84px;
}

:root, [data-theme="light"] {
  --bg:#F5F8F7; --surface:#FFFFFF; --elevated:#FFFFFF;
  --ink:#0D1F1B; --ink-muted:#4A5F59; --line:#DCE5E2;
  --brand:#0B6B4F; --brand-ink:#FFFFFF; --accent:#FFC533;
  --success:#12A150; --warning:#B7791F; --danger:#C53030;
}
[data-theme="dark"] {
  --bg:#04141A; --surface:#0B2129; --elevated:#13303A;
  --ink:#E9F2F0; --ink-muted:#93A9A4; --line:#1B3A44;
  --brand:#10B981; --brand-ink:#04141A; --accent:#FFB020;
  --success:#34D399; --warning:#FBBF24; --danger:#F87171;
}
```

Carregar fontes (auto-hospedadas, sem chamada a terceiros):

```bash
npm i @fontsource-variable/inter @fontsource-variable/bricolage-grotesque
```
```ts
// main.tsx
import '@fontsource-variable/inter';
import '@fontsource-variable/bricolage-grotesque';
```

Regra de lint para impedir regressão (exemplo com `no-restricted-syntax`/plugin de Tailwind): proibir `bg-emerald-*`, `text-black`, `bg-[#…]`, `text-[9px|10px|11px]` fora de `components/ui`.

### 3.4 Inventário de componentes a criar/padronizar

`AppShell` (tab/detail/flow) · `BottomNav` (a11y) · `Button` (`cta`, `soft`, `whatsapp`, `danger-soft`; `xl`) · `Input`/`Field` (label, ajuda, erro) · `Chip`/`FilterBar` · `SessionCard` (foto) · `SessionCardSkeleton` (mesmo layout) · `PriceTag` · `SpotsMeter` · `RatingBadge` ("Novo" vs média) · `StatusPill` (ícone + texto) · `Avatar` (iniciais local) · `CoverImage` (recorte, blur-up, fallback por modalidade) · `EmptyState` · `ErrorState` · `StatCard` · `SectionHeader` · `ConfirmDialog` (substitui `window.confirm`) · `BottomSheet` (filtros) · `Ticket` (reserva com QR) · `Countdown` · `ShareCardGenerator` · `Stepper`.

---

## 4. Redesign das telas-chave

### 4.1 Card de aula (Feed) — foto primeiro

```
┌────────────────────────────────────────┐
│ [   CAPA 16:9 (foto/gradiente da       │
│      modalidade)                    ♡ ]│
│ ┌──────────┐            ┌────────────┐ │
│ │ Hoje 07h │            │ 3 vagas    │ │
│ └──────────┘            └────────────┘ │
├────────────────────────────────────────┤
│ Futevôlei iniciante · 60 min           │  ← título
│ ◯ Felipe Nery  ★ 4,9 (32)  · Verificado│  ← profissional + prova social real
│ 📍 Praia de Ipanema · 1,2 km           │
│                                        │
│ R$ 45,00 / vaga        [ Reservar ]    │
└────────────────────────────────────────┘
```

- Toque no card abre os detalhes (com transição de elemento compartilhado da capa); o botão reserva direto.
- "Verificado" só com `credential_verified`. Sem avaliações: selo "Novo".
- Vagas como número + medidor sutil; pulso **apenas** quando o número muda.
- Grupos por dia com cabeçalho fixo: **Hoje · Amanhã · Sábado, 5 de out**.

### 4.2 Detalhes da aula

```
┌────────────────────────────────────────┐
│ ‹ (voltar)             (compartilhar) ♡│
│        CAPA / GALERIA (swipe)          │
│ ───────────────────────────────────────│
│ Futevôlei iniciante                    │
│ Sáb, 5 out · 07:00–08:00 · Iniciante   │
│ ◯ Felipe Nery ★4,9 · Ver perfil        │
│ ───────────────────────────────────────│
│ 📍 Praia de Ipanema, posto 9   [Mapa]  │
│ 👥 6 de 10 vagas  ▓▓▓▓▓▓░░░░           │
│ 🎒 Levar: água, protetor solar         │
│ Sobre a aula …                         │
│ Cancelamento: grátis até 4h antes      │
│ Avaliações (32) …  Mais aulas dele …   │
├────────────────────────────────────────┤
│ R$ 45,00        [   Reservar vaga   ]  │  ← barra fixa (sem BottomNav aqui)
└────────────────────────────────────────┘
```

### 4.3 Checkout em passos + confirmação como ingresso

```
1 Resumo  →  2 Pagar (Pix QR + copia e cola + contagem 29:41)  →  3 Confirmado

┌──────────── INGRESSO ─────────────┐
│ Futevôlei iniciante               │
│ Sáb, 5 out · 07:00 · Ipanema      │
│ ▓▓▓▓▓▓▓▓▓▓  (QR para check-in)    │
│ [Adicionar ao calendário] [Rota]  │
│ [Avisar que vou chegar atrasado]  │
└───────────────────────────────────┘
```

O ingresso vive em "Reservas" e substitui o "manda o comprovante no WhatsApp". O QR serve ao check-in do profissional (fluxo de encerramento de aula da auditoria técnica).

### 4.4 Dashboard do profissional — orientado a ação

```
Bom dia, Felipe                                   [modo aluno ⇄]
┌ Hoje ────────────────────────────────────────┐
│ 07:00 Futevôlei · 6/10 · 2 pagamentos pend.  │
│ [Abrir lista de presença]                    │
└──────────────────────────────────────────────┘
┌ Sua página ──────────────────────────────────┐
│ riff.pro/@felipe   [Copiar] [Compartilhar]   │
└──────────────────────────────────────────────┘
Receita (30 dias)  R$ 1.240  ▲ 12%   ▁▂▄▆▇
Ocupação média 72% · Alunos ativos 18 · Nota 4,9
Para fazer:  ☐ Adicionar foto de capa  ☐ Ativar Pix dinâmico
             ☐ Criar aula da semana que vem [Repetir a última]
```

### 4.5 Demais telas (resumo das mudanças)

- **Landing:** hero com produto real (card + página `/@nome` de exemplo), 3 passos, calculadora de ganhos, aluno e profissional como entradas paralelas, prova social real, rodapé legal. Sem gradiente numa palavra só e sem lista de cartões idênticos.
- **Feed/Busca:** barra de busca sempre visível; filtros em *bottom sheet* (modalidade, dia, faixa de preço, nível, distância, "só com vagas"); modo lista/mapa; "Salvos".
- **Perfil público:** capa, frase de posicionamento, botão fixo "Reservar próxima aula", agenda em lista por dia, galeria, avaliações com filtro, FAQ, botão "Falar no WhatsApp" **depois da reserva** (alinhado à decisão de dados sensíveis).
- **Criação de aula:** foto de capa, nível, tipo de local, recorrência, "o que levar", prévia do card **e** dos detalhes, rascunho, "Repetir aula".
- **Desktop:** painel do profissional em layout largo (menu lateral, calendário semanal, tabela de reservas, ações em massa); telas do aluno mantêm coluna central, mas com moldura e fundo trabalhados (não uma faixa vazia).

---

## 5. Sistema de movimento e efeitos

### 5.1 Regras

- **Responde ao usuário:** abrir, expandir, confirmar, mover. Sem loops decorativos.
- **Rápido:** 120–200ms para feedback, 200–320ms para transições de tela, até 480ms para o momento de destaque (reserva confirmada).
- **Um destaque por tela:** um único elemento ganha brilho/animação de atenção.
- **Respeita o sistema:** `<MotionConfig reducedMotion="user">` na raiz, sem exceções.

### 5.2 Catálogo de microinterações (o que implementar)

| Momento | Efeito | Detalhe |
|---|---|---|
| Card → detalhes | *Shared element* da capa | `layoutId` na imagem + fade do conteúdo (ou View Transitions API onde suportada). |
| Reservar | Drawer com mola e botão que vira "check" | `stiffness ~380, damping ~32`; ícone de check desenhado (stroke) em 300ms. |
| Reserva confirmada | Ingresso "entra" de baixo, leve escala e vibração tátil | `navigator.vibrate(15)` onde houver; sem confete gratuito. |
| Contador de vagas | Número rola (*odometer*) quando muda ao vivo | Só quando o valor muda; combina com Supabase Realtime. |
| Contagem regressiva do Pix | Anel de progresso sutil e cor que muda nos últimos 5 min | Sem piscar. |
| Lista de aulas | Entrada escalonada **só na primeira carga**, máx. 6 itens | `Math.min(index, 6) * 0.04`. |
| Pull to refresh | Indicador elástico | Atualiza o feed e reordena. |
| Trocar aba | Indicador deslizante (já existe na BottomNav) + conteúdo com fade curto | Manter `layoutId`. |
| Favoritar | Coração com "pop" e preenchimento | 200ms, sem partículas. |
| Cancelar/encerrar | `ConfirmDialog` com consequência clara e *undo* de 5s (toast com "Desfazer") | Substitui `window.confirm`. |
| Sucesso de publicação | Toast com ação "Ver / Compartilhar" | Leva direto ao compartilhamento. |
| Carregamento | Esqueleto com *shimmer* discreto, do mesmo formato do conteúdo | Sem spinner em listas. |
| Ação otimista | Botão mostra o novo estado imediatamente e reverte em erro | React Query `onMutate`/`onError`. |

### 5.3 Efeitos visuais (usar com moderação)

- **Capa com *blur-up*:** miniatura borrada que resolve para a imagem (percepção de velocidade).
- **Gradientes de modalidade** como fallback de capa (cada categoria com par de cores próprio), evitando o "bloco vazio".
- **Vidro (blur)** apenas em barras fixas sobre conteúdo rolando (BottomNav, cabeçalhos), não em todo cartão.
- **Sombras por elevação** em vez de bordas brancas translúcidas.
- **Brilho de CTA** reservado à ação principal da tela.

### 5.4 Código de apoio

```tsx
// App.tsx — respeita "reduzir movimento" no sistema inteiro
import { MotionConfig } from 'framer-motion';
<MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
  {/* ... */}
</MotionConfig>
```

```tsx
// Feed.tsx — atraso limitado, animação só na primeira carga
<motion.div
  initial={firstLoad ? { opacity: 0, y: 8 } : false}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: Math.min(index, 6) * 0.04 }}
/>
```

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: .01ms !important; animation-iteration-count: 1 !important;
      transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

---

## 6. Código de referência (correções imediatas)

**6.1 Link público (UX-01)**

```diff
- const publicUrl = "https://riff.pro/@ + publicSlug + ";
+ const publicUrl = `${import.meta.env.VITE_PUBLIC_URL ?? window.location.origin}/@${publicSlug}`;
```

**6.2 `index.html` (RES-01, RES-05, UX-08)**

```html
<html lang="pt-BR">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#F5F8F7" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#04141A" media="(prefers-color-scheme: dark)" />
<meta name="description" content="Reserve aulas e cursos direto com profissionais." />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
<title>Riff — aulas e cursos com quem entende</title>
```

```css
.pt-safe { padding-top: env(safe-area-inset-top, 0px); }
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
.min-h-app { min-height: 100dvh; }
```

**6.3 Formatadores pt-BR (COPY-05)**

```ts
// lib/format.ts
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (v: number) => brl.format(v);

const plural = new Intl.PluralRules('pt-BR');
export const spotsLabel = (n: number) =>
  n <= 0 ? 'Lotada' : `${n} ${plural.select(n) === 'one' ? 'vaga' : 'vagas'}`;

export const todayInSP = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()); // YYYY-MM-DD
```

**6.4 BottomNav acessível e restrita a rotas de app (NAV-02/03/04)**

```tsx
const APP_ROUTES = ['/feed','/explore','/my-bookings','/dashboard','/my-sessions','/earnings','/profile'];
const showNav = !!user && APP_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'));
if (!showNav) return null;

<nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-50 pb-safe">
  {items.map(item => (
    <NavLink key={item.path} to={item.path} aria-label={item.label}
      className={({ isActive }) => cn('flex flex-col items-center gap-1 min-h-11 min-w-14 text-xs',
        isActive ? 'text-brand' : 'text-ink-muted')}>
      <item.icon className="size-6" aria-hidden />
      <span>{item.label}</span>                {/* sempre visível */}
    </NavLink>
  ))}
</nav>
```

**6.5 Card fotográfico (esqueleto do componente)**

```tsx
export function SessionCard({ session }: { session: FeedSession }) {
  const spots = session.max_participants - session.current_participants;
  return (
    <Link to={`/session/${session.id}`} className="block overflow-hidden rounded-card bg-surface shadow-1 active:scale-[.99] transition-transform">
      <div className="relative aspect-[16/9] bg-elevated">
        <CoverImage src={session.cover_image_url} category={session.category?.slug} alt="" />
        <StatusPill className="absolute left-3 top-3" tone="neutral">{formatWhen(session)}</StatusPill>
        <StatusPill className="absolute right-3 top-3" tone={spots <= 2 ? 'warning' : 'neutral'}>{spotsLabel(spots)}</StatusPill>
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-display text-lg leading-snug">{session.title}</h3>
        <ProRow pro={session.professional} />           {/* RatingBadge: "Novo" ou média real */}
        <p className="text-sm text-ink-muted">{session.location_name}</p>
        <div className="flex items-center justify-between pt-1">
          <PriceTag value={session.price_per_slot} />
          <Button variant="cta" size="lg" onClick={(e) => { e.preventDefault(); onReserve(session); }}>Reservar</Button>
        </div>
      </div>
    </Link>
  );
}
```

---

## 7. Ideias e visão de produto (experiência)

**Para o aluno**
- **Home personalizada:** "Sua próxima aula" em destaque (contagem regressiva, mapa, avisar atraso), depois "Perto de você" e "De quem você já treinou".
- **Salvos e alertas:** favoritar profissional/modalidade e ser avisado quando abrir turma ou vaga (lista de espera).
- **Ingresso digital com QR**, calendário em um toque, rota até o local.
- **Avaliação leve:** notificação após a aula com estrelas em um toque e etiquetas rápidas.
- **Reservar de novo** com um toque, e reservar para um amigo (convidado).
- **Compartilhar aula** como imagem bonita (stories/WhatsApp), com link que abre a página com prévia rica.

**Para o profissional**
- **Publicar uma aula em 30 segundos:** "Repetir a última", *templates* por modalidade e recorrência ("toda terça e quinta").
- **Central do dia:** o que fazer agora (pagamentos pendentes, presença, encerrar aula).
- **Sua página profissional:** capa, galeria, depoimentos, botão de agenda, QR para imprimir e colar na praia/academia.
- **Cartão de divulgação gerado:** imagem pronta com nome, foto, modalidade, próximo horário e QR.
- **Relatórios simples:** ocupação, receita, quem sumiu; sugestões acionáveis ("terça 19h lota; abrir turma extra?").
- **Comunicação:** modelos de mensagem de WhatsApp (lembrete, cancelamento, novidades) com um toque.

**Para a marca**
- Identidade própria (wordmark, símbolo, fotografia de pessoas reais, paleta), voz de marca consistente e página "Como funciona" honesta sobre taxas, Pix, cancelamento e verificação.
- **Selo "Registro verificado"** com regras públicas (quem confere e como), que vira diferencial competitivo.
- **Cursos e séries** como cidadãos de primeira classe (página própria, módulos/encontros, matrícula, certificado).

---

## 8. Roadmap de design

### Sprint 0 · Bugs e confiança (2–4 dias)
- [ ] Corrigir link público (UX-01) e testar copiar/compartilhar.
- [ ] Remover/condicionar conteúdo fictício: "98% presença", "Na aula você tem", bio e especialidades padrão, nota 5.0 padrão, "Ocupação: Alta" (UX-02/03/05).
- [ ] Selo de verificação só com `credential_verified` (UX-04) e ajustar a promessa da Landing.
- [ ] Corrigir mojibake/BOM (UX-07), `lang`, `<title>` e meta (UX-08).
- [ ] Ajustar a frase do erro global (UX-06).
- [ ] BottomNav só logado e em rotas de app; rótulos sempre visíveis; espaço duplicado (NAV-02/03/04).
- [ ] Card do feed abre detalhes (NAV-01); barra de reserva sem colisão.
- [ ] `viewport-fit=cover`, `pt-safe`, `dvh` (RES-01/02/03).

### Fase 1 · Fundação do design system (2–3 semanas)
- [ ] Definir a direção visual (A/B/C) e a paleta com checagem de contraste.
- [ ] Tokens semânticos, tema claro/escuro, tipografia carregada e escala.
- [ ] Variantes de `Button`, `Field`, `StatusPill`, `RatingBadge`, `PriceTag`, `EmptyState`, `ErrorState`, `ConfirmDialog`, skeletons fiéis.
- [ ] Migração das telas de autenticação para os componentes do sistema.
- [ ] Lint contra cores hardcoded, `<button>` cru e texto < 12px; `jsx-a11y`.
- [ ] Storybook + testes de regressão visual (Playwright screenshots).
- [ ] `MotionConfig` global e tokens de movimento.

### Fase 2 · Telas centrais (4–6 semanas)
- [ ] Upload e uso de **capa da aula** (e galeria do profissional) com recorte e *blur-up*.
- [ ] Novo Card, Feed com filtros/busca/agrupamento por dia, Detalhes completos, Perfil público novo.
- [ ] Checkout em passos + ingresso com QR (junto do Pix dinâmico da auditoria técnica).
- [ ] Dashboard orientado a ação, tela "Encerrar aula", calendário do profissional.
- [ ] Feed/Explore públicos; SEO e OG dinâmico das páginas públicas.
- [ ] PWA instalável (manifest, ícones, splash) e estados offline/erro.

### Fase 3 · Diferenciação (2–4 meses)
- [ ] Transições *shared element*, contadores ao vivo (Realtime), haptics.
- [ ] Cursos e séries, lista de espera, favoritos e alertas.
- [ ] Gerador de cartão/imagem de divulgação, QR do perfil.
- [ ] Layout desktop do painel do profissional.
- [ ] Modo claro/escuro completo com preferência salva; personalização de página do profissional (cores/tema).

---

## 9. Como medir se ficou melhor

**Qualidade técnica (automatizável)**
- Lighthouse mobile: Performance ≥ 90, Acessibilidade ≥ 95; LCP < 2,5 s, CLS < 0,1, INP < 200 ms.
- axe/jest-axe nas telas principais: 0 violações críticas.
- Regressão visual em Playwright (iPhone SE, iPhone 15, Pixel 7, tablet, desktop).
- Testes manuais: iOS Safari e Android Chrome (teclado sobre formulários, barras de sistema, orientação, rede lenta).

**Experiência (produto)**
- Tempo do card à reserva confirmada; taxa de abandono por passo do checkout.
- % de reservas pagas dentro da janela de retenção; tempo até primeira aula publicada (profissional).
- Taxa de compartilhamento do link/cartão; visitantes → cadastros → primeira reserva.
- Pesquisa curta pós-aula (1 pergunta) e NPS do profissional.
- Testes de usabilidade com 5 alunos e 5 profissionais reais, celular na mão, ao ar livre.

---

## 10. Decisões que o time precisa tomar

1. **Direção visual:** A (evolução do dark), B (claro fotográfico, recomendada) ou C (esporte em cores fortes)?
2. **Escopo da marca:** continuar "esporte/fitness" ou assumir "aulas e cursos" em geral (muda nome do produto, categorias, imagens e copy)?
3. **Quem produz as imagens:** fotos enviadas pelos profissionais (exige guia e recorte automático) ou banco de imagens por modalidade como fallback?
4. **Pagamento e confirmação:** a prioridade do Pix dinâmico define a UX do checkout e do ingresso.
5. **Desktop:** o painel do profissional será responsivo de verdade agora ou depois do mobile?
6. **Nome/domínio:** `riff.pro` fixo no código hoje; qual é o domínio de produção e o formato do link público?
7. **Verificação profissional:** processo e prazo, porque a interface promete algo que o backend ainda não entrega.

---

## Apêndice — números levantados no código

| Métrica | Valor |
|---|---|
| `<button>` crus fora de `components/ui` | 52 |
| `<Button>` (componente) fora de `components/ui` | 17 |
| Textos com tamanho 9/10/11px | 34 |
| Ocorrências de `uppercase` | 38 |
| `aria-label` fora de `components/ui` | 1 |
| `prefers-reduced-motion` / `useReducedMotion` | 0 |
| Estilos `hover:` fora de `components/ui` | 72 |
| `<img>` fora de `components/ui` / com `loading="lazy"` | 7 / 0 |
| Arquivos que usam Framer Motion | 12 |
| Usos de `cover_image_url` em telas | 0 |
| Usos de `favorites` em telas | 0 |
| Usos de `min-h-screen` (100vh) | ~20 |
| Cores de marca hardcoded (`emerald-*`, `white/…`, `text-black`) | ~288 |

*Análise por leitura de código, sem execução do app. Confirme os itens marcados como "provável" em aparelhos reais e reavalie os contrastes ao definir a paleta final.*
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-09-29T00:45:02-03:00.
</ADDITIONAL_METADATA>