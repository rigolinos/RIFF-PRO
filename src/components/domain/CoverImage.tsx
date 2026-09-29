import { cn } from '@/lib/utils';
import { Dumbbell } from 'lucide-react';

interface CoverImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  categorySlug?: string;
  fallbackIcon?: React.ReactNode;
}

export function CoverImage({ src, categorySlug, fallbackIcon, className, children, ...props }: CoverImageProps) {
  // Gradients for fallback based on category
  const getGradient = (slug?: string) => {
    switch (slug) {
      case 'futevolei':
      case 'volei-praia':
      case 'beach-tennis':
        return 'from-amber-600/40 to-bg';
      case 'yoga':
      case 'pilates':
        return 'from-purple-600/40 to-bg';
      case 'crossfit':
      case 'hiit':
        return 'from-danger/40 to-bg';
      case 'surf':
      case 'natacao':
        return 'from-blue-600/40 to-bg';
      default:
        return 'from-brand/40 to-bg';
    }
  };

  return (
    <div className={cn("relative w-full overflow-hidden bg-surface", className)} {...props}>
      {src ? (
        <img 
          src={src} 
          alt="Capa da sessão" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center", getGradient(categorySlug))}>
          <div className="text-bg/20 scale-150">
            {fallbackIcon || <Dumbbell className="w-16 h-16" />}
          </div>
        </div>
      )}
      
      {/* Véu escuro na base */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent opacity-90 pointer-events-none" />
      
      {/* Absolute content (like badges) */}
      {children}
    </div>
  );
}
