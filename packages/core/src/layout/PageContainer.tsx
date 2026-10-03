import { cn } from '@riff/core/lib/utils';
import { Header } from './Header';

interface PageContainerProps {
  children: React.ReactNode;
  title?: React.ReactNode;
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
    <div className="min-h-[100dvh] bg-bg flex flex-col relative w-full overflow-x-hidden text-foreground">
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
