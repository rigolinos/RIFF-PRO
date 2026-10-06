import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '@riff/core/supabase/client';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Input } from '@riff/core/ui/input';
import { useDebounce } from '@riff/core/hooks/useDebounce';
import { Avatar, EmptyState, StatusPill } from '@riff/core/domain';
import { HeroHeader } from '@riff/core/layout/HeroHeader';
import type { Tables } from '@riff/core/supabase/types';

export default function Explore() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  const [professionals, setProfessionals] = useState<Tables<'profiles'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<Error | null>(null);

  useEffect(() => {
    async function searchPros() {
      setIsLoading(true);
      setErrorState(null);
      try {
        let query = supabase
          .from('profiles')
          .select('id, full_name, avatar_url, public_slug, city, rating_avg, total_reviews, specialties')
          .eq('role', 'professional')
          .is('deleted_at', null);

        if (debouncedSearch) {
          query = query.ilike('full_name', `%${debouncedSearch}%`);
        } else {
          // If no search, order by best rated
          query = query.order('rating_avg', { ascending: false }).limit(20);
        }

        const { data, error } = await query;
        if (error) {
          console.error('Error fetching professionals:', error);
          setErrorState(error as Error);
        }
        if (!error && data) {
          setProfessionals(data as unknown as Tables<'profiles'>[]);
        }
      } catch (err: unknown) {
        console.error(err);
        setErrorState(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }

    searchPros();
  }, [debouncedSearch]);

  return (
    <PageContainer withBottomNav>
      <HeroHeader label="Explorar" title="Encontre quem organiza" subtitle="Professores, organizadores de jogos e eventos perto de você.">
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar pelo nome"
            aria-label="Buscar organizador pelo nome"
            className="pl-9 h-12 bg-bg/70 border-line rounded-xl"
          />
        </div>
      </HeroHeader>

      <div className="px-4 py-6 space-y-2">
        <h2 className="type-label px-2">{debouncedSearch ? 'Resultados' : 'Mais bem avaliados'}</h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
          </div>
        ) : errorState ? (
          <EmptyState
            icon={AlertCircle}
            title="Erro ao carregar organizadores"
            description="Não foi possível buscar agora. Tente de novo em instantes."
            action={{ label: 'Tentar novamente', onClick: () => window.location.reload() }}
          />
        ) : professionals.length === 0 ? (
          <EmptyState icon={Search} title="Ninguém com esse nome" description="Confira a grafia ou veja as atividades da sua cidade no Início." />
        ) : (
          <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {professionals.map((pro) => {
              const specialties = Array.isArray(pro.specialties) ? (pro.specialties as string[]) : [];
              return (
                <li key={pro.id}>
                  <Link to={pro.public_slug ? `/@${pro.public_slug}` : `/pro/${pro.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-elevated">
                    <Avatar src={pro.avatar_url} name={pro.full_name} className="w-12 h-12" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{pro.full_name}</p>
                      <p className="text-xs text-ink-muted truncate">
                        {[pro.city, specialties.slice(0, 2).join(', ')].filter(Boolean).join(' · ') || 'Organizador'}
                      </p>
                    </div>
                    {(pro.total_reviews ?? 0) > 0 ? (
                      <span className="flex items-center gap-1 text-sm font-semibold text-ink shrink-0">
                        <Star className="w-3.5 h-3.5 text-accent fill-accent" /> {(pro.rating_avg ?? 0).toFixed(1)}
                        <span className="text-xs text-ink-muted font-normal">({pro.total_reviews})</span>
                      </span>
                    ) : (
                      <StatusPill text="Novo" variant="info" className="shrink-0" />
                    )}
                    <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
