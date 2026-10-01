import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionWithJoins } from '@/types/session';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { PageContainer } from '@/components/layout/PageContainer';
import { ModeSwitcher } from '@/components/layout/ModeSwitcher';
import { useSessions } from '@/hooks/useSessions';
import { useCategories } from '@/hooks/useCategories';
import { SessionCard } from '@/components/cards/SessionCard';
import { SessionCardSkeleton } from '@/components/skeletons/SessionCardSkeleton';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { useProfile } from '@/hooks/useProfile';
import { EmptyState } from '@/components/domain';
import { KINDS, ActivityKind } from '@/lib/copy';

// Compara cidades sem acento, caixa ou espaços ("Porto alegre" = "Porto Alegre").
const normalizeCity = (city?: string | null) =>
  (city ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

export const Feed = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { feed: sessions, isLoadingFeed, isErrorFeed, errorFeed } = useSessions();
  if (isErrorFeed && errorFeed) console.error('Error fetching feed:', errorFeed);
  const { data: categories, isLoading: isLoadingCategories } = useCategories();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedKind, setSelectedKind] = useState<ActivityKind | 'all'>('all');
  const [selectedSession, setSelectedSession] = useState<SessionWithJoins | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Filter sessions based on category
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    let result = sessions;
    if (selectedCategory !== 'all') result = result.filter(s => s.category_id === selectedCategory);
    if (selectedKind !== 'all') result = result.filter(s => s.kind === selectedKind);
    return result;
    
  }, [sessions, selectedCategory, selectedKind]);

  // Cidade da pessoa primeiro; as outras cidades vêm numa seção abaixo.
  const myCity = normalizeCity(profile?.city);
  const localSessions = useMemo(
    () => (myCity ? filteredSessions.filter((s) => normalizeCity(s.city) === myCity) : filteredSessions),
    [filteredSessions, myCity],
  );
  const otherCitySessions = useMemo(
    () => (myCity ? filteredSessions.filter((s) => normalizeCity(s.city) !== myCity) : []),
    [filteredSessions, myCity],
  );

  // Group by date logic
  const groupedSessions = useMemo(() => {
    const groups: { label: string; dateGroupStr: string; sessions: SessionWithJoins[] }[] = [];
    
    // Create a map to group
    const map = new Map<string, { label: string; sessions: SessionWithJoins[] }>();
    
    localSessions.forEach(session => {
      const date = parseISO(session.date);
      let label = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
      // capitalize first letter
      label = label.charAt(0).toUpperCase() + label.slice(1);
      
      
      
      if (isToday(date)) {
        label = 'Hoje';
      } else if (isTomorrow(date)) {
        label = 'Amanhã';
      }

      // Agrupa pela data (AAAA-MM-DD); o rótulo vai junto, sem precisar ser extraído da chave.
      if (!map.has(session.date)) {
        map.set(session.date, { label, sessions: [] });
      }
      map.get(session.date)!.sessions.push(session as unknown as SessionWithJoins);
    });

    for (const [dateGroupStr, { label, sessions }] of Array.from(map.entries())) {
      groups.push({ label, dateGroupStr, sessions });
    }

    // Sort groups chronologically
    return groups.sort((a, b) => a.dateGroupStr.localeCompare(b.dateGroupStr));
  }, [localSessions]);

  const handleBookClick = (session: SessionWithJoins) => {
    setSelectedSession(session);
    setIsCheckoutOpen(true);
  };

  return (
    <PageContainer title={<ModeSwitcher />} withBottomNav>
      <div className="pt-12 pb-4 px-6 sticky top-0 z-30 bg-bg/90 backdrop-blur-xl border-b border-line">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-ink-muted">Sua cidade</p>
            <div className="flex items-center gap-1">
              <h2 className="type-title">
                {profile?.city || 'Sua Cidade'}
              </h2>
            </div>
          </div>
          <button
            onClick={() => navigate('/explore')}
            aria-label="Buscar organizadores"
            className="w-12 h-12 rounded-full bg-surface border border-line flex items-center justify-center text-ink hover:bg-elevated transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 -mx-6 px-6 mb-2">
          <button
            onClick={() => setSelectedKind('all')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              selectedKind === 'all' 
                ? 'bg-brand text-brand-ink' 
                : 'bg-surface text-ink-muted border border-line'
            }`}
          >
            Todos os Tipos
          </button>
          {Object.entries(KINDS).map(([k, meta]) => (
            <button
              key={k}
              onClick={() => setSelectedKind(k as ActivityKind)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                selectedKind === k 
                  ? 'bg-brand text-brand-ink' 
                  : 'bg-surface text-ink-muted border border-line'
              }`}
            >
              {meta.chip}
            </button>
          ))}
        </div>
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
        ) : groupedSessions.length === 0 && otherCitySessions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center mt-8"
          >
            <EmptyState 
              icon={Search}
              title="Nenhuma atividade encontrada"
              description={selectedCategory === 'all' 
                ? 'Ainda não há atividades publicadas na sua região.' 
                : 'Não encontramos atividades dessa modalidade por agora.'}
              action={{
                label: 'Limpar Filtros',
                onClick: () => setSelectedCategory('all')
              }}
              className="w-full"
            />
          </motion.div>
        ) : (
          <div className="space-y-8">
            {groupedSessions.length === 0 && (
              <p className="text-sm text-ink-muted">
                Ainda não há atividades em {profile?.city}. Veja o que está rolando em outras cidades.
              </p>
            )}
            {groupedSessions.map((group, groupIndex) => (
              <div key={group.dateGroupStr}>
                <h3 className="type-subtitle text-ink mb-4">{group.label}</h3>
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
            {otherCitySessions.length > 0 && (
              <div>
                <h3 className="type-subtitle text-ink mb-4">Em outras cidades</h3>
                <div className="space-y-4">
                  {otherCitySessions.map((session) => (
                    <SessionCard key={session.id} session={session as unknown as SessionWithJoins} onBookClick={handleBookClick} />
                  ))}
                </div>
              </div>
            )}
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
