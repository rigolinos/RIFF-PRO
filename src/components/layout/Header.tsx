import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
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
      <div className="flex items-center gap-3 w-1/3">
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

      <div className="flex-1 flex justify-center w-1/3">
        {title && (
          <h1 className="text-base font-semibold text-foreground truncate">
            {title}
          </h1>
        )}
      </div>

      <div className="flex justify-end w-1/3">
        {rightAction}
      </div>
    </div>
  );
};
