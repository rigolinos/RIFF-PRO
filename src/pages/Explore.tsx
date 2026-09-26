import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce'; // We will create this

export default function Explore() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function searchPros() {
      setIsLoading(true);
      try {
        let query = supabase
          .from('profiles')
          .select('id, full_name, avatar_url, public_slug, city, rating_avg, total_reviews, specialties')
          .eq('role', 'professional');

        if (debouncedSearch) {
          query = query.ilike('full_name', `%${debouncedSearch}%`);
        } else {
          // If no search, order by best rated
          query = query.order('rating_avg', { ascending: false }).limit(20);
        }

        const { data, error } = await query;
        if (!error && data) {
          setProfessionals(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    searchPros();
  }, [debouncedSearch]);

  return (
    <PageContainer title="Explorar" withBottomNav>
      <div className="px-6 py-4 sticky top-0 bg-background/95 backdrop-blur-md z-10 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou modalidade..." 
            className="pl-9 h-12 bg-white/[0.05] border-white/10 rounded-xl"
          />
        </div>
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : professionals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum profissional encontrado.
          </div>
        ) : (
          <div className="space-y-4">
            {professionals.map(pro => (
              <Link 
                key={pro.id} 
                to={pro.public_slug ? `/@${pro.public_slug}` : `/pro/${pro.id}`}
                className="block glass-card p-4 hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 shrink-0 overflow-hidden">
                    {pro.avatar_url ? (
                      <img src={pro.avatar_url} alt={pro.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold bg-emerald-500/20 text-emerald-500">
                        {pro.full_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-foreground truncate">{pro.full_name}</h3>
                    
                    {pro.city && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{pro.city}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-400">
                          {pro.rating_avg > 0 ? pro.rating_avg.toFixed(1) : '5.0'}
                        </span>
                        <span className="text-xs text-muted-foreground ml-0.5">
                          ({pro.total_reviews})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
