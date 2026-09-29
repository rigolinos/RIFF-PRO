import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-ink rounded-xl shadow-[0_4px_14px_rgba(11,107,79,0.25)] hover:shadow-[0_6px_20px_rgba(11,107,79,0.35)] hover:-translate-y-0.5",
        secondary: "bg-surface text-ink border border-line rounded-xl shadow-1 hover:bg-bg",
        ghost: "text-ink-muted rounded-xl hover:bg-black/5 dark:hover:bg-white/5 hover:text-ink",
        pill: "rounded-full bg-brand/10 text-brand hover:bg-brand/20",
        destructive: "rounded-xl bg-danger/10 text-danger hover:bg-danger/20",
        // Keeping legacy variants for compatibility while we migrate
        default: "bg-brand text-brand-ink rounded-xl shadow-[0_4px_14px_rgba(11,107,79,0.25)] hover:shadow-[0_6px_20px_rgba(11,107,79,0.35)] hover:-translate-y-0.5",
        outline: "bg-surface text-ink border border-line rounded-xl shadow-1 hover:bg-bg",
        link: "text-brand underline-offset-4 hover:underline rounded-xl",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-9 px-4 text-xs rounded-lg",
        lg: "h-14 px-8 text-base",
        icon: "h-12 w-12",
        "icon-sm": "h-9 w-9 rounded-lg",
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
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
