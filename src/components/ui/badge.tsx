import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — Riff DS v2
 * Tamanho mínimo de texto: 12px (spec do briefing).
 * Nunca usar text-[9px|10px|11px] em badges visíveis.
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors border",
  {
    variants: {
      variant: {
        // Ação / destaque
        default:      "border-transparent bg-brand text-brand-ink",
        primary:      "border-transparent bg-brand text-brand-ink",

        // Neutro / informação
        secondary:    "border-line bg-elevated text-ink",
        outline:      "border-line bg-transparent text-ink-muted",

        // Status positivo
        success:      "border-transparent bg-success/15 text-success",

        // Alerta — vagas, preço pendente (âmbar ≠ dourado)
        warning:      "border-transparent bg-accent/15 text-accent",

        // Perigo / cancelado
        destructive:  "border-transparent bg-danger/15 text-danger",

        // Chip / tag (leve — fundo brand suave)
        pill:         "border-transparent bg-brand/10 text-brand",

        // Chip de categoria no card (fundo elevado, sem borda chamativa)
        category:     "border-line bg-elevated text-ink-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
