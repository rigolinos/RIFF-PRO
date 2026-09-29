import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-line bg-surface relative overflow-hidden",
        className
      )} 
      {...props}
    >
      {/* Texture: Linhas paralelas do "R" */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex" style={{
        background: 'repeating-linear-gradient(45deg, transparent 0 10px, var(--brand) 10px 12px)'
      }} />

      <div className="relative z-10 flex flex-col items-center">
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-elevated border border-line flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-slate" />
          </div>
        )}
        <h3 className="text-lg font-display font-bold text-ink mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-ink-muted mb-6 max-w-[280px]">
            {description}
          </p>
        )}
        {action && (
          <Button onClick={action.onClick} variant="outline" className="min-w-[120px]">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
