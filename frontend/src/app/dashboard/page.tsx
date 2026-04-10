'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, UserPlus, TrendingUp, TrendingDown, MapPin,
  Vote, Crown, Trophy, Activity, Target,
} from 'lucide-react';
import AppShell from '@/components/app-shell';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { KPICard } from '@/components/dashboard/kpi-card';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JarvisButton } from '@/components/jarvis/jarvis-button';

const NIVEL_LABELS: Record<string, string> = {
  '0': 'Desconhecido', '1': 'Contrário', '2': 'Indeciso',
  '3': 'Simpatizante', '4': 'Apoiador', '5': 'Multiplicador',
};
const NIVEL_COLORS: Record<string, string> = {
  '0': 'bg-gray-100 text-gray-700', '1': 'bg-red-100 text-red-700', '2': 'bg-amber-100 text-amber-700',
  '3': 'bg-blue-100 text-blue-700', '4': 'bg-emerald-100 text-emerald-700', '5': 'bg-purple-100 text-purple-700',
};

interface DashStats {
  total: number;
  esta_semana: number;
  semana_passada: number;
  trend_pct: number;
  por_nivel: Record<string, number>;
  por_bairro: { bairro: string; total: number }[];
  evolucao_semanal: { date: string; count: number }[];
}

interface GeoMarker {
  id: number;
  nome: string;
  lat: number;
  lng: number;
  nivel_apoio: number;
  bairro: string | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [markers, setMarkers] = useState<GeoMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<any[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [statsRes, geoRes, rankRes] = await Promise.all([
        api.get('/eleitores/dashboard/stats'),
        api.get('/eleitores/geo/markers'),
        api.get('/liderancas/ranking').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setMarkers(geoRes.data);
      setRanking(rankRes.data.slice(0, 5));
    } catch {
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Inicializar mapa de calor
  useEffect(() => {
    if (!mapRef.current || markers.length === 0) return;
    if (mapInstanceRef.current) return;

    if (!(window as any).google?.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}&libraries=visualization`;
      script.async = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [markers]);

  const initMap = () => {
    if (!mapRef.current || !(window as any).google?.maps) return;
    const google = (window as any).google;

    const validMarkers = markers.filter(m => m.lat && m.lng);
    const center = validMarkers.length > 0
      ? { lat: validMarkers.reduce((s, m) => s + m.lat, 0) / validMarkers.length, lng: validMarkers.reduce((s, m) => s + m.lng, 0) / validMarkers.length }
      : { lat: -7.2172, lng: -35.8811 };

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });

    const heatmapData = validMarkers.map(m => ({
      location: new google.maps.LatLng(m.lat, m.lng),
      weight: (m.nivel_apoio || 1) + 1,
    }));

    new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map,
      radius: 40,
      opacity: 0.7,
      gradient: [
        'rgba(0, 0, 0, 0)', 'rgba(0, 0, 255, 0.3)', 'rgba(0, 200, 255, 0.5)',
        'rgba(0, 255, 100, 0.6)', 'rgba(255, 255, 0, 0.7)', 'rgba(255, 150, 0, 0.8)',
        'rgba(255, 0, 0, 0.9)',
      ],
    });

    mapInstanceRef.current = map;
  };

  if (authLoading || !user) return null;

  return (
    <AppShell>
      <div className="space-y-4 lg:space-y-6 max-w-7xl mx-auto pb-6">
        <PageHeader title="Dashboard" description={user.role === 'lideranca' ? `Olá, ${user.name}! Seu painel de campanha.` : 'Visão geral da campanha'} />

        {loading || !stats ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <KPICard label="Total de Eleitores" value={stats.total} icon={Vote} index={0} />
              <KPICard
                label="Cadastros esta semana"
                value={stats.esta_semana}
                icon={UserPlus}
                trend={stats.trend_pct >= 0 ? 'up' : 'down'}
                trendValue={`${stats.trend_pct >= 0 ? '+' : ''}${stats.trend_pct}%`}
                previousValue={`${stats.semana_passada} sem. passada`}
                index={1}
              />
              <KPICard label="Apoiadores" value={Number(stats.por_nivel['4'] || 0)} icon={Users} index={2} />
              <KPICard label="Multiplicadores" value={Number(stats.por_nivel['5'] || 0)} icon={Crown} index={3} />
            </div>

            {/* Mapa de Calor */}
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4 pb-0">
                  <div>
                    <h3 className="font-semibold text-[15px]">Mapa de Calor</h3>
                    <p className="text-[12px] text-muted-foreground">{markers.length} eleitores geolocalizados</p>
                  </div>
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div ref={mapRef} className="w-full h-[400px] mt-3 rounded-b-xl" />
                {markers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-xl">
                    <p className="text-sm text-muted-foreground">Cadastre eleitores com CEP/endereço para visualizar no mapa</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Distribuição por nível */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-[15px] mb-4">Distribuição por Nível de Apoio</h3>
                  <div className="space-y-3">
                    {Object.entries(stats.por_nivel).sort(([a], [b]) => Number(b) - Number(a)).map(([nivel, count]) => {
                      const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                      return (
                        <div key={nivel} className="flex items-center gap-3">
                          <Badge variant="outline" className={`text-[10px] w-28 justify-center ${NIVEL_COLORS[nivel] || ''}`}>
                            {NIVEL_LABELS[nivel] || `Nível ${nivel}`}
                          </Badge>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-semibold w-12 text-right">{count}</span>
                          <span className="text-[11px] text-muted-foreground w-10 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Top bairros */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-[15px] mb-4">Top Bairros</h3>
                  {stats.por_bairro.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum bairro registrado</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.por_bairro.map((b, i) => (
                        <div key={b.bairro} className="flex items-center gap-3">
                          <span className="text-[12px] font-bold text-muted-foreground w-6">#{i + 1}</span>
                          <span className="flex-1 text-sm">{b.bairro}</span>
                          <span className="text-sm font-semibold">{b.total}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top 5 lideranças (só para admin) */}
            {user.role !== 'lideranca' && ranking.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[15px]">Top 5 Lideranças</h3>
                    <button onClick={() => router.push('/ranking')} className="text-[12px] text-primary font-medium hover:underline">Ver ranking completo</button>
                  </div>
                  <div className="space-y-3">
                    {ranking.map((r: any, i: number) => (
                      <div key={r.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                        }`}>#{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.nome}</p>
                          {r.regiao && <p className="text-[11px] text-muted-foreground">{r.regiao}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{r.total_eleitores}</p>
                          {r.meta > 0 && <p className="text-[11px] text-muted-foreground">{r.percentual}%</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      <JarvisButton />
    </AppShell>
  );
}
