import { cn } from '@/lib/utils';
import { Avatar as BaseAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function Avatar({ src, name, className, fallbackClassName }: UserAvatarProps) {
  const getInitials = (name?: string | null) => {
    if (!name) return 'R';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <BaseAvatar className={cn("border border-line shadow-sm", className)}>
      {src && <AvatarImage src={src} alt={name || 'Avatar'} className="object-cover" />}
      <AvatarFallback className={cn("bg-elevated text-ink-muted font-medium font-display", fallbackClassName)}>
        {getInitials(name)}
      </AvatarFallback>
    </BaseAvatar>
  );
}
