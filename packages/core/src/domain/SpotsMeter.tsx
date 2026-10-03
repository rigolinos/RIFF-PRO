import { cn } from '@riff/core/lib/utils';

interface SpotsMeterProps extends React.HTMLAttributes<HTMLDivElement> {
  current: number;
  max: number;
}

export function SpotsMeter({ current, max, className, ...props }: SpotsMeterProps) {
  const safeMax = Math.max(1, max);
  const percentage = Math.min(100, Math.max(0, (current / safeMax) * 100));
  
  const isAlmostFull = percentage >= 80;
  const fillColor = isAlmostFull ? 'bg-accent' : 'bg-brand';
  const arrowColor = isAlmostFull ? 'text-accent' : 'text-brand';

  return (
    <div className={cn("relative w-full h-1.5 rounded-full bg-elevated overflow-visible", className)} {...props}>
      <div 
        className={cn("absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500 flex items-center justify-end", fillColor)}
        style={{ width: `${percentage}%` }}
      >
        {percentage > 5 && (
          <div className={cn("absolute -right-1 translate-x-[2px]", arrowColor)}>
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L1 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
