import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'full-color' | 'full-white' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ variant = 'full-color', size = 'md', className, ...props }: LogoProps) {
  const getSrc = () => {
    switch (variant) {
      case 'full-white':
        return '/brand/riff-logo-full-branco.png';
      case 'icon':
        return '/brand/riff-icone-arqueiro.png';
      case 'full-color':
      default:
        return '/brand/riff-logo-full-cores.png';
    }
  };

  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16',
  };

  const altText = variant === 'icon' ? 'Riff Ícone' : 'Riff Logo';

  return (
    <div className={cn("flex items-center justify-center", className)} {...props}>
      <img
        src={getSrc()}
        alt={altText}
        className={cn("w-auto object-contain select-none", sizeClasses[size])}
        draggable={false}
      />
    </div>
  );
}
