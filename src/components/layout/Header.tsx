import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
  transparent?: boolean;
}

export const Header = ({ 
  title, 
  showBack = false, 
  onBack, 
  rightAction,
  className,
  transparent = false
}: HeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div 
      className={cn(
        "sticky top-0 z-40 w-full flex items-center justify-between px-6 h-16 transition-all",
        transparent ? "bg-transparent" : "bg-background/80 backdrop-blur-md border-b border-border/50",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-[3rem]">
        {showBack && (
          <button 
            onClick={handleBack}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="flex-1 min-w-0 flex justify-center px-2">
        {title && (
          <h1 className="type-subtitle text-center whitespace-nowrap truncate">
            {title}
          </h1>
        )}
      </div>

      <div className="flex justify-end min-w-[3rem]">
        {rightAction}
      </div>
    </div>
  );
};
