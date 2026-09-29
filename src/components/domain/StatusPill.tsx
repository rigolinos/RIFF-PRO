import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { LucideIcon, CheckCircle2, AlertCircle, XCircle, Info, Clock } from 'lucide-react';

const statusPillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-surface border border-line text-ink-muted',
        success: 'bg-success/15 text-success',
        alert: 'bg-accent/15 text-accent',
        danger: 'bg-danger/15 text-danger',
        info: 'bg-brand/10 text-brand',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

interface StatusPillProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof statusPillVariants> {
  icon?: LucideIcon;
  text: string;
}

const defaultIcons = {
  neutral: Clock,
  success: CheckCircle2,
  alert: AlertCircle,
  danger: XCircle,
  info: Info,
};

export function StatusPill({ variant, icon: Icon, text, className, ...props }: StatusPillProps) {
  const IconToRender = Icon || (variant ? defaultIcons[variant] : defaultIcons.neutral);

  return (
    <div className={cn(statusPillVariants({ variant }), className)} {...props}>
      <IconToRender className="w-3.5 h-3.5" />
      <span>{text}</span>
    </div>
  );
}
