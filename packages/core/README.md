# @riff/core: núcleo compartilhado

O que é **comum ao Riff Pro e ao Riff Clubes**: os dois apps importam daqui. A regra do `CLAUDE.md` é **"nada de copiar código entre os produtos"**: se algo serve para os dois, vem para cá.

Importe sempre por `@riff/core/...` (alias configurado no `vite.config.ts` e no `tsconfig.app.json`).

| Pasta | O que tem |
|---|---|
| `styles/riff.css` | Design system: tokens de cor, fontes, escala tipográfica e base. Cada app importa este arquivo e pode sobrescrever tokens de acento ou fundo. |
| `ui/` | Primitivas shadcn/Radix (botão, diálogo, seletor…) e o `Logo` da marca-mãe. Ficam fora do `check:ds`. |
| `domain/` | Componentes de domínio: `Avatar`, `PriceTag`, `RatingBadge`, `SpotsMeter`, `StatusPill`, `EmptyState`, `ConfirmDialog`, `CoverImage`. |
| `supabase/` | Cliente do banco único e `types.ts` gerado (`npx supabase gen types`). |
| `hooks/` | Sessão e conta, iguais nos dois apps: `useAuth`, `useProfile`, `useLegalAcceptance`, além de utilitários (`useDebounce`, `use-mobile`, `use-toast`). |
| `lib/` | `utils` (`cn`, `errorMessage`), `copy` (vocabulário oficial e tipos de atividade), `attribution` (origem das reservas). |
| `legal/` | Documentos legais e versões (`LEGAL_VERSIONS`). |
| `layout/` | `Header`, `PageContainer`, `HeroHeader`, `StickyActions`, `BottomNavBar` e `AuthShell` (moldura das telas de entrada e do onboarding). |
| `auth/` | Telas de entrada iguais nos dois apps, com o nome do produto como parâmetro: `LoginScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`, `NotFoundScreen` e `safeRedirect`. Cadastro e aceite ficam em cada app (o conteúdo muda). |
| `routing/` | `ProtectedRoute` (sessão + aceite dos termos) e `PublicRoute`. |
| `app/` | `GlobalErrorBoundary`. |
| `assets/brand/` | Imagens do logo Riff Sports, empacotadas pelo Vite. |

**Não entra aqui:** o que é de um produto só. Por exemplo `brand.ts` (nome, domínio, og-image), telas, navegação inferior, o seletor de modo organizador/participante e os hooks de atividades do Pro. Isso fica em cada app.
