import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { PageContainer } from '@/components/layout/PageContainer';
import { useSessions } from '@/hooks/useSessions';
import { useCategories } from '@/hooks/useCategories';
import { SessionCard } from '@/components/cards/SessionCard';
import { SessionCardSkeleton } from '@/components/skeletons/SessionCardSkeleton';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { useProfile } from '@/hooks/useProfile';
import { EmptyState } from '@/components/domain';

export const Feed = () => {
  const { profile } = useProfile();
  const { feed: sessions, isLoadingFeed } = useSessions();
  const { data: categories, isLoading: isLoadingCategories } = useCategories();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Filter sessions based on category
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (selectedCategory === 'all') return sessions;
    return sessions.filter(session => session.category_id === selectedCategory);
  }, [sessions, selectedCategory]);

  // Group by date logic
  const groupedSessions = useMemo(() => {
    const groups: { label: string; dateGroupStr: string; sessions: any[] }[] = [];
    
    // Create a map to group
    const map = new Map<string, any[]>();
    
    filteredSessions.forEach(session => {
      const date = parseISO(session.date);
      let label = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
      // capitalize first letter
      label = label.charAt(0).toUpperCase() + label.slice(1);
      
      let dateGroupStr = session.date;
      
      if (isToday(date)) {
        label = 'Hoje';
      } else if (isTomorrow(date)) {
        label = 'Amanhã';
      }

      const key = session.date + '-' + label; // ensures ordering and grouping uniqueness
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(session);
    });

    for (const [key, items] of Array.from(map.entries())) {
      const [dateGroupStr, label] = key.split('-');
      groups.push({
        label,
        dateGroupStr,
        sessions: items
      });
    }

    // Sort groups chronologically
    return groups.sort((a, b) => a.dateGroupStr.localeCompare(b.dateGroupStr));
  }, [filteredSessions]);

  const handleBookClick = (session: any) => {
    setSelectedSession(session);
    setIsCheckoutOpen(true);
  };

  return (
    <PageContainer withBottomNav>
      <div className="pt-12 pb-4 px-6 sticky top-0 z-30 bg-bg/90 backdrop-blur-xl border-b border-line">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-ink-muted">Local atual</p>
            <div className="flex items-center gap-1">
              <h2 className="text-xl font-display font-bold text-ink">
                {profile?.city || 'Sua Cidade'}
              </h2>
            </div>
          </div>
          <button className="w-12 h-12 rounded-full bg-surface border border-line flex items-center justify-center text-ink hover:bg-elevated transition-colors">
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 -mx-6 px-6">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 px-4 h-10 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              selectedCategory === 'all'
                ? 'bg-brand text-brand-ink font-semibold'
                : 'bg-surface border border-line text-ink-muted hover:bg-elevated'
            }`}
          >
            🎯 Todas
          </button>
          
          {isLoadingCategories ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="shrink-0 w-24 h-10 rounded-full bg-surface animate-pulse" />
              ))}
            </div>
          ) : (
            categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-4 h-10 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedCategory === cat.id
                    ? 'bg-brand text-brand-ink font-semibold'
                    : 'bg-surface border border-line text-ink-muted hover:bg-elevated'
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.name}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="px-6 py-6 flex-1 flex flex-col">
        {isLoadingFeed ? (
          <div className="space-y-4">
            <SessionCardSkeleton />
            <SessionCardSkeleton />
          </div>
        ) : groupedSessions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center mt-8"
          >
            <EmptyState 
              icon={Search}
              title="Nenhuma aula encontrada"
              description={selectedCategory === 'all' 
                ? 'Ainda não há aulas publicadas na sua região.' 
                : 'Não encontramos aulas dessa modalidade por agora.'}
              action={{
                label: 'Limpar Filtros',
                onClick: () => setSelectedCategory('all')
              }}
              className="w-full"
            />
          </motion.div>
        ) : (
          <div className="space-y-8">
            {groupedSessions.map((group, groupIndex) => (
              <div key={group.dateGroupStr}>
                <h3 className="font-display font-bold text-xl text-ink mb-4">{group.label}</h3>
                <div className="space-y-4">
                  {group.sessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (groupIndex * 0.1) + (index * 0.05) }}
                    >
                      <SessionCard session={session} onBookClick={handleBookClick} />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSession && (
        <CheckoutModal 
          isOpen={isCheckoutOpen} 
          onClose={() => setIsCheckoutOpen(false)} 
          session={selectedSession}
          onSuccess={() => {}}
        />
      )}
    </PageContainer>
  );
};
export default Feed;
