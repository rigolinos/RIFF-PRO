import { useState, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

import { PageContainer } from '@/components/layout/PageContainer';
import { useSessions } from '@/hooks/useSessions';
import { useCategories } from '@/hooks/useCategories';
import { SessionCard } from '@/components/cards/SessionCard';
import { SessionCardSkeleton } from '@/components/skeletons/SessionCardSkeleton';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { useProfile } from '@/hooks/useProfile';

const Feed = () => {
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

  const handleBookClick = (session: any) => {
    setSelectedSession(session);
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSuccess = () => {
    // Refresh triggered automatically by react-query
  };

  return (
    <PageContainer withBottomNav>
      {/* Top Header */}
      <div className="pt-12 pb-4 px-6 sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Local atual</p>
            <div className="flex items-center gap-1">
              <h2 className="text-lg font-bold text-foreground">
                {profile?.city || 'Sua Cidade'}
              </h2>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-foreground hover:bg-white/10 transition-colors">
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 -mx-6 px-6">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 px-4 h-10 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
            }`}
          >
            ðŸ”¥ Todas
          </button>
          
          {isLoadingCategories ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="shrink-0 w-24 h-10 rounded-full bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-4 h-10 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Feed Content */}
      <div className="px-6 py-6 flex-1 flex flex-col">
                {isLoadingFeed ? (
          <div className="space-y-4">
            <SessionCardSkeleton />
            <SessionCardSkeleton />
            <SessionCardSkeleton />
          </div>
        ) : filteredSessions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center mt-12"
          >
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 max-w-xs text-center backdrop-blur-md">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mb-4 mx-auto shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma aula encontrada</h3>
              <p className="text-muted-foreground text-sm mb-6">
                {selectedCategory === 'all' 
                  ? 'Ainda nÃ£o hÃ¡ aulas publicadas na sua regiÃ£o.' 
                  : 'NÃ£o encontramos aulas dessa modalidade por agora.'}
              </p>
              <button onClick={() => setSelectedCategory('all')} className="w-full bg-white/5 hover:bg-white/10 text-foreground text-sm font-semibold py-2.5 rounded-xl transition-all">
                Limpar Filtros
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <SessionCard session={session} onBookClick={handleBookClick} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Checkout Drawer */}
      <CheckoutModal 
        session={selectedSession}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={handleCheckoutSuccess}
      />
    </PageContainer>
  );
};

export default Feed;

