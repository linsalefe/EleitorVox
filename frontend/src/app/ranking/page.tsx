'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Medal, Crown, Users, TrendingUp, Loader2 } from 'lucide-react';
import AppShell from '@/components/app-shell';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RankItem {
  id: number;
  nome: string;
  tipo: string;
  regiao: string | null;
  meta: number;
  total_eleitores: number;
  percentual: number;
}

const TIPO_LABELS: Record<string, string> = {
  coordenador_regional: 'Coordenador',
  lider_bairro: 'Líder de Bairro',
  cabo_eleitoral: 'Cabo Eleitoral',
};

const PODIUM_STYLES = [
  { bg: 'from-yellow-400 to-amber-500', icon: Trophy, ring: 'ring-yellow-400/30', text: 'text-yellow-700' },
  { bg: 'from-gray-300 to-gray-400', icon: Medal, ring: 'ring-gray-300/30', text: 'text-gray-600' },
  { bg: 'from-orange-400 to-orange-500', icon: Medal, ring: 'ring-orange-400/30', text: 'text-orange-700' },
];

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      api.get('/liderancas/ranking')
        .then(res => setRanking(res.data))
        .catch(() => toast.error('Erro ao carregar ranking'))
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || !user) return null;

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto pb-10">
        <PageHeader title="Ranking de Lideranças" description="Quem está cadastrando mais eleitores" />

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p>Nenhuma liderança cadastrada ainda.</p>
          </div>
        ) : (
          <>
            {/* Pódio Top 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-8">
              {top3.map((item, i) => {
                const style = PODIUM_STYLES[i];
                const Icon = style.icon;
                return (
                  <Card key={item.id} className={`relative overflow-hidden ${i === 0 ? 'md:order-2 md:-mt-4' : i === 1 ? 'md:order-1' : 'md:order-3'}`}>
                    <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${style.bg}`} />
                    <CardContent className="p-6 text-center">
                      <div className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br ${style.bg} flex items-center justify-center ring-4 ${style.ring} shadow-lg`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <p className="text-2xl font-bold mb-0.5">#{i + 1}</p>
                      <h3 className="font-semibold text-[15px] mb-1">{item.nome}</h3>
                      <Badge variant="outline" className="text-[10px] mb-3">{TIPO_LABELS[item.tipo] || item.tipo}</Badge>
                      {item.regiao && <p className="text-[12px] text-muted-foreground mb-3">{item.regiao}</p>}
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-3xl font-bold text-primary">{item.total_eleitores}</p>
                        <p className="text-[12px] text-muted-foreground">eleitores cadastrados</p>
                        {item.meta > 0 && (
                          <>
                            <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(item.percentual, 100)}%` }} />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">{item.percentual}% da meta ({item.meta})</p>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Resto do ranking */}
            {rest.length > 0 && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="grid grid-cols-[50px_1fr_100px_120px_80px] px-4 py-3 border-b bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>#</span><span>Liderança</span><span>Tipo</span><span>Eleitores</span><span>Meta</span>
                </div>
                {rest.map((item, i) => (
                  <div key={item.id} className="grid grid-cols-[50px_1fr_100px_120px_80px] items-center px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <span className="text-sm font-bold text-muted-foreground">#{i + 4}</span>
                    <div>
                      <p className="text-sm font-medium">{item.nome}</p>
                      {item.regiao && <p className="text-[11px] text-muted-foreground">{item.regiao}</p>}
                    </div>
                    <span className="text-[12px] text-muted-foreground">{TIPO_LABELS[item.tipo] || item.tipo}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{item.total_eleitores}</span>
                      {item.meta > 0 && (
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(item.percentual, 100)}%` }} />
                        </div>
                      )}
                    </div>
                    <span className="text-[12px] text-muted-foreground">{item.percentual}%</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
