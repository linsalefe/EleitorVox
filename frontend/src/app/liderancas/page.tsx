'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Pencil, Loader2, Crown, Users, TrendingUp,
  ChevronRight, ChevronDown,
} from 'lucide-react';
import AppShell from '@/components/app-shell';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import ConfirmModal from '@/components/ConfirmModal';

const TIPOS = [
  { value: 'coordenador_regional', label: 'Coordenador Regional' },
  { value: 'lider_bairro', label: 'Líder de Bairro' },
  { value: 'cabo_eleitoral', label: 'Cabo Eleitoral' },
];

const TIPO_COLORS: Record<string, string> = {
  coordenador_regional: 'bg-purple-50 text-purple-700 border-purple-200',
  lider_bairro: 'bg-blue-50 text-blue-700 border-blue-200',
  cabo_eleitoral: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

interface Lideranca {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  tipo: string;
  regiao: string | null;
  lideranca_pai_id: number | null;
  meta_eleitores: number;
  total_eleitores: number;
  percentual: number;
  is_active: boolean;
  created_at: string | null;
}

interface HierarquiaNode {
  id: number;
  nome: string;
  tipo: string;
  regiao: string | null;
  meta: number;
  total_eleitores: number;
  filhos: HierarquiaNode[];
}

export default function LiderancasPage() {
  const [liderancas, setLiderancas] = useState<Lideranca[]>([]);
  const [hierarquia, setHierarquia] = useState<HierarquiaNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'lista' | 'hierarquia'>('lista');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lideranca | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    nome: '', telefone: '', email: '', tipo: 'cabo_eleitoral',
    regiao: '', lideranca_pai_id: '', meta_eleitores: '0',
  });

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

  const load = async () => {
    try {
      const [listRes, hierRes] = await Promise.all([
        api.get('/liderancas'),
        api.get('/liderancas/hierarquia'),
      ]);
      setLiderancas(listRes.data.liderancas || []);
      setHierarquia(hierRes.data || []);
    } catch { toast.error('Erro ao carregar lideranças'); } finally { setLoading(false); }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const resetForm = () => setForm({ nome: '', telefone: '', email: '', tipo: 'cabo_eleitoral', regiao: '', lideranca_pai_id: '', meta_eleitores: '0' });

  const openCreate = () => { resetForm(); setEditId(null); setShowModal(true); };

  const openEdit = (l: Lideranca) => {
    setEditId(l.id);
    setForm({
      nome: l.nome, telefone: l.telefone || '', email: l.email || '',
      tipo: l.tipo, regiao: l.regiao || '',
      lideranca_pai_id: l.lideranca_pai_id ? String(l.lideranca_pai_id) : '',
      meta_eleitores: String(l.meta_eleitores),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return toast.error('Informe o nome');
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        meta_eleitores: Number(form.meta_eleitores),
        lideranca_pai_id: form.lideranca_pai_id ? Number(form.lideranca_pai_id) : null,
      };
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });

      if (editId) {
        await api.put(`/liderancas/${editId}`, payload);
        toast.success('Liderança atualizada');
      } else {
        await api.post('/liderancas', payload);
        toast.success('Liderança criada');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/liderancas/${deleteTarget.id}`);
      toast.success('Liderança removida');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Erro ao remover'); } finally { setDeleting(false); }
  };

  if (authLoading || !user) return null;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto pb-10">
        <PageHeader
          title="Lideranças"
          description={`${liderancas.length} lideranças cadastradas`}
          actions={
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'lista' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setView('lista')}
                >Lista</button>
                <button
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'hierarquia' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setView('hierarquia')}
                >Hierarquia</button>
              </div>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Nova liderança
              </Button>
            </div>
          }
        />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[1,2,3].map(i => <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : liderancas.length === 0 ? (
          <EmptyState
            icon={Crown}
            title="Nenhuma liderança cadastrada"
            description="Cadastre coordenadores, líderes de bairro e cabos eleitorais."
            actionLabel="Nova liderança"
            onAction={openCreate}
          />
        ) : view === 'lista' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {liderancas.map(l => (
              <Card key={l.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-[15px]">{l.nome}</h3>
                      <Badge variant="outline" className={`text-[11px] mt-1 ${TIPO_COLORS[l.tipo] || ''}`}>
                        {TIPOS.find(t => t.value === l.tipo)?.label || l.tipo}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteTarget(l)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {l.regiao && <p className="text-[13px] text-muted-foreground mb-3">{l.regiao}</p>}
                  {l.telefone && <p className="text-[12px] text-muted-foreground mb-3">{l.telefone}</p>}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Eleitores</span>
                      <span className="font-semibold">{l.total_eleitores} / {l.meta_eleitores}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(l.percentual, 100)}%` }}
                      />
                    </div>
                    <p className="text-[12px] text-muted-foreground text-right">{l.percentual}%</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {hierarquia.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma hierarquia definida. Vincule lideranças a lideranças-pai para montar a árvore.</p>
            ) : (
              hierarquia.map(node => <HierarquiaItem key={node.id} node={node} level={0} />)
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Editar liderança' : 'Nova liderança'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} placeholder="Nome da liderança" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({...form, tipo: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Região / Bairro</Label>
              <Input value={form.regiao} onChange={(e) => setForm({...form, regiao: e.target.value})} placeholder="Ex: Zona Norte, Bodocongó" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} placeholder="83999999999" />
              </div>
              <div className="space-y-1.5">
                <Label>Meta de eleitores</Label>
                <Input type="number" value={form.meta_eleitores} onChange={(e) => setForm({...form, meta_eleitores: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="email@exemplo.com" />
            </div>
            {liderancas.length > 0 && (
              <div className="space-y-1.5">
                <Label>Liderança superior</Label>
                <Select value={form.lideranca_pai_id || 'none'} onValueChange={(v) => setForm({...form, lideranca_pai_id: v === 'none' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                    {liderancas.filter(l => l.id !== editId).map(l => <SelectItem key={l.id} value={String(l.id)}>{l.nome} ({TIPOS.find(t => t.value === l.tipo)?.label})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : editId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!deleteTarget}
        title="Excluir liderança"
        message={`Excluir ${deleteTarget?.nome}? Os eleitores vinculados ficarão sem liderança.`}
        confirmLabel={deleting ? 'Excluindo...' : 'Excluir'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </AppShell>
  );
}

function HierarquiaItem({ node, level }: { node: HierarquiaNode; level: number }) {
  const [open, setOpen] = useState(level < 2);
  const hasFilhos = node.filhos.length > 0;
  const pct = node.meta > 0 ? Math.round((node.total_eleitores / node.meta) * 100) : 0;

  return (
    <div style={{ marginLeft: level * 24 }}>
      <div className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
        {hasFilhos ? (
          <button onClick={() => setOpen(!open)} className="p-0.5">
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
        ) : <div className="w-5" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{node.nome}</span>
            <Badge variant="outline" className={`text-[10px] ${TIPO_COLORS[node.tipo] || ''}`}>
              {TIPOS.find(t => t.value === node.tipo)?.label || node.tipo}
            </Badge>
            {node.regiao && <span className="text-[11px] text-muted-foreground">{node.regiao}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{node.total_eleitores}/{node.meta}</span>
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <span className="text-xs font-medium w-10 text-right">{pct}%</span>
        </div>
      </div>
      {open && hasFilhos && (
        <div className="mt-1 space-y-1">
          {node.filhos.map(f => <HierarquiaItem key={f.id} node={f} level={level + 1} />)}
        </div>
      )}
    </div>
  );
}
