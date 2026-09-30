import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Button — Riff DS v2
 *
 * Variantes do briefing:
 *   primary   – fundo --brand, texto --brand-ink, shadow-cta   → UMA ação por tela
 *   secondary – fundo --elevated, texto --ink                   → ação de apoio
 *   inverted  – fundo claro, texto --bg                         → contraste alto sobre escuro
 *   outline   – borda --brand, texto --brand                    → alternativa a primary
 *   soft      – fundo brand-soft/12, texto --brand              → ação leve / favoritar
 *   danger    – fundo danger/12, texto --danger                 → cancelar / excluir
 *   ghost     – sem fundo, texto --ink-muted                    → ação terciária
 *   pill      – rounded-full, fundo brand/10                    → chips / tags
 *   whatsapp  – verde WhatsApp exclusivo                        → único uso permitido
 *   link      – underline, sem fundo                            → links inline
 *
 * Tamanhos: sm=40, default=48, lg=52, xl=56 px   (mín. toque 44 px)
 */

const buttonVariants = cva(
  // Base: fonte Space Grotesk (herda do body), peso 600, alvo de toque mínimo 44px
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-semibold text-sm tracking-tight transition-all select-none",
    "active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  ].join(" "),
  {
    variants: {
      variant: {
        // ── Principais ─────────────────────────────────────────────────
        primary:
          "bg-brand text-brand-ink rounded-xl shadow-[var(--shadow-cta)] hover:brightness-105",
        secondary:
          "bg-elevated text-ink border border-line rounded-xl shadow-1 hover:bg-surface",
        inverted:
          "bg-[#E4E4EC] text-bg rounded-xl hover:bg-white",
        outline:
          "border border-brand text-brand rounded-xl bg-transparent hover:bg-brand/10",
        soft:
          "bg-brand/[0.12] text-brand rounded-xl hover:bg-brand/20",
        danger:
          "bg-danger/[0.12] text-danger rounded-xl hover:bg-danger/20",
        ghost:
          "text-ink-muted rounded-xl hover:bg-white/5 hover:text-ink",
        pill:
          "rounded-full bg-brand/10 text-brand hover:bg-brand/20",
        whatsapp:
          "bg-[#25D366] text-white rounded-xl hover:bg-[#1DB954] shadow-[0_8px_24px_rgba(37,211,102,0.25)]",
        link:
          "text-brand underline-offset-4 hover:underline rounded-xl p-0 h-auto",

        // ── Aliases para não quebrar código existente ───────────────────
        default:
          "bg-brand text-brand-ink rounded-xl shadow-[var(--shadow-cta)] hover:brightness-105",
        destructive:
          "bg-danger/[0.12] text-danger rounded-xl hover:bg-danger/20",
      },
      size: {
        sm:      "h-10 px-4 text-sm rounded-lg min-w-[44px]",
        default: "h-12 px-6 min-w-[44px]",
        lg:      "h-[52px] px-8 text-base",
        xl:      "h-14 px-10 text-base",
        icon:    "h-12 w-12 rounded-xl",
        "icon-sm": "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
