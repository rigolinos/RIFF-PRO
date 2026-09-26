import { cn } from '@/lib/utils';
import { Header } from './Header';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
  withBottomNav?: boolean;
  headerTransparent?: boolean;
}

export const PageContainer = ({
  children,
  title,
  showBack,
  onBack,
  rightAction,
  className,
  withBottomNav = true,
  headerTransparent = false,
}: PageContainerProps) => {
  return (
    <div className="min-h-screen bg-[#010E12] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))] flex flex-col relative w-full overflow-x-hidden text-foreground">
      {(title || showBack || rightAction) && (
        <Header 
          title={title} 
          showBack={showBack} 
          onBack={onBack} 
          rightAction={rightAction}
          transparent={headerTransparent}
        />
      )}
      
      <main className={cn(
        "flex-1 flex flex-col w-full",
        !headerTransparent && (title || showBack) ? "" : "pt-safe",
        withBottomNav ? "pb-24" : "pb-8", // extra padding if BottomNav is present
        className
      )}>
        {children}
      </main>
    </div>
  );
};
