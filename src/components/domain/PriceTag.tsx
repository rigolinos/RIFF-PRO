import { cn } from '@/lib/utils';

interface PriceTagProps extends React.HTMLAttributes<HTMLDivElement> {
  amount: number;
  freeLabel?: string;
}

export function PriceTag({ amount, freeLabel = 'Gratuito', className, ...props }: PriceTagProps) {
  if (amount === 0) {
    return (
      <div className={cn("text-success type-subtitle", className)} {...props}>
        {freeLabel}
      </div>
    );
  }

  // Format explicitly as R$ 0,00
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

  const parts = formatter.formatToParts(amount);
  const currencyPart = parts.find(p => p.type === 'currency')?.value || 'R$';
  
  // Get everything after the currency symbol (and whitespace)
  const valueString = formatter.format(amount).replace(currencyPart, '').trim();

  return (
    <div className={cn("text-accent font-display font-bold flex items-baseline gap-1", className)} {...props}>
      <span className="text-sm font-semibold">{currencyPart}</span>
      <span className="tabular-nums tracking-tight text-lg">{valueString}</span>
    </div>
  );
}
