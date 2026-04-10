'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Pencil, Loader2, Upload, X, Search,
  Users, MapPin, Phone, Vote, ChevronLeft, ChevronRight,
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
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { TableSkeleton } from '@/components/skeletons/table-skeleton';
import ConfirmModal from '@/components/ConfirmModal';

const NIVEIS_APOIO = [
  { value: 0, label: 'Desconhecido', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 1, label: 'Contrário', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 2, label: 'Indeciso', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 3, label: 'Simpatizante', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 4, label: 'Apoiador', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 5, label: 'Multiplicador', color: 'bg-purple-50 text-purple-700 border-purple-200' },
];

const ORIGENS = ['corpo-a-corpo', 'whatsapp', 'landing-page', 'indicação', 'evento', 'csv'];

interface Eleitor {
  id: number;
  nome_completo: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  zona_eleitoral: string | null;
  secao_eleitoral: string | null;
  nivel_apoio: number;
  origem: string | null;
  lideranca_id: number | null;
  observacoes: string | null;
  created_at: string | null;
  endereco: string | null;
  cep: string | null;
  titulo_eleitor: string | null;
  data_nascimento: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Lideranca {
  id: number;
  nome: string;
}

export default function EleitoresPage() {
  const [eleitores, setEleitores] = useState<Eleitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState('');
  const [filterBairro, setFilterBairro] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [filterOrigem, setFilterOrigem] = useState('');
  const [filterLideranca, setFilterLideranca] = useState('');

  const [liderancas, setLiderancas] = useState<Lideranca[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Eleitor | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form fields
  const [form, setForm] = useState({
    nome_completo: '', cpf: '', telefone: '', email: '',
    data_nascimento: '', titulo_eleitor: '', zona_eleitoral: '', secao_eleitoral: '',
    endereco: '', bairro: '', cidade: '', estado: 'PB', cep: '',
    nivel_apoio: '0', origem: '', lideranca_id: '', observacoes: '',
  });

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

  const loadEleitores = useCallback(async () => {
    try {
      const params: any = { page, limit: 50 };
      if (search) params.search = search;
      if (filterBairro) params.bairro = filterBairro;
      if (filterNivel) params.nivel_apoio = filterNivel;
      if (filterOrigem) params.origem = filterOrigem;
      if (filterLideranca) params.lideranca_id = filterLideranca;
      const res = await api.get('/eleitores', { params });
      setEleitores(res.data.eleitores);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast.error('Erro ao carregar eleitores');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterBairro, filterNivel, filterOrigem, filterLideranca]);

  const loadLiderancas = async () => {
    try {
      const res = await api.get('/liderancas');
      setLiderancas(res.data.liderancas || []);
    } catch {}
  };

  useEffect(() => { if (user) { loadEleitores(); loadLiderancas(); } }, [user, loadEleitores]);

  const resetForm = () => setForm({
    nome_completo: '', cpf: '', telefone: '', email: '',
    data_nascimento: '', titulo_eleitor: '', zona_eleitoral: '', secao_eleitoral: '',
    endereco: '', bairro: '', cidade: '', estado: 'PB', cep: '',
    nivel_apoio: '0', origem: '', lideranca_id: '', observacoes: '',
  });

  const openCreate = () => { resetForm(); setEditId(null); setShowModal(true); };

  const openEdit = (e: Eleitor) => {
    setEditId(e.id);
    setForm({
      nome_completo: e.nome_completo || '', cpf: e.cpf || '', telefone: e.telefone || '',
      email: e.email || '', data_nascimento: e.data_nascimento?.split('T')[0] || '',
      titulo_eleitor: e.titulo_eleitor || '', zona_eleitoral: e.zona_eleitoral || '',
      secao_eleitoral: e.secao_eleitoral || '', endereco: e.endereco || '',
      bairro: e.bairro || '', cidade: e.cidade || '', estado: e.estado || 'PB',
      cep: e.cep || '', nivel_apoio: String(e.nivel_apoio ?? 0),
      origem: e.origem || '', lideranca_id: e.lideranca_id ? String(e.lideranca_id) : '',
      observacoes: e.observacoes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nome_completo.trim()) return toast.error('Informe o nome completo');
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        nivel_apoio: Number(form.nivel_apoio),
        lideranca_id: form.lideranca_id ? Number(form.lideranca_id) : null,
      };
      // Remove empty strings
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });

      if (editId) {
        await api.put(`/eleitores/${editId}`, payload);
        toast.success('Eleitor atualizado');
      } else {
        await api.post('/eleitores', payload);
        toast.success('Eleitor cadastrado');
      }
      setShowModal(false);
      loadEleitores();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/eleitores/${deleteTarget.id}`);
      toast.success('Eleitor removido');
      setDeleteTarget(null);
      loadEleitores();
    } catch { toast.error('Erro ao remover'); } finally { setDeleting(false); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    toast.loading('Importando eleitores...');
    try {
      const res = await api.post('/eleitores/import-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.dismiss();
      toast.success(`${res.data.importados} eleitores importados`);
      if (res.data.erros?.length > 0) toast.warning(`${res.data.erros.length} linhas com erro`);
      loadEleitores();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err?.response?.data?.detail || 'Erro na importação');
    }
    e.target.value = '';
  };

  const getNivel = (n: number) => NIVEIS_APOIO.find(x => x.value === n) || NIVEIS_APOIO[0];

  if (authLoading || !user) return null;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto pb-10">
        <PageHeader
          title="Eleitores"
          description={`${total} eleitores cadastrados`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild className="cursor-pointer">
                <label>
                  <Upload className="h-4 w-4 mr-2" /> Importar CSV
                  <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
                </label>
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Novo eleitor
              </Button>
            </div>
          }
        />

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 mt-6 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou CPF..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={filterNivel} onValueChange={(v) => { setFilterNivel(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Nível de apoio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              {NIVEIS_APOIO.map(n => <SelectItem key={n.value} value={String(n.value)}>{n.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterOrigem} onValueChange={(v) => { setFilterOrigem(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              {ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          {liderancas.length > 0 && (
            <Select value={filterLideranca} onValueChange={(v) => { setFilterLideranca(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Liderança" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas lideranças</SelectItem>
                {liderancas.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tabela */}
        {loading ? (
          <TableSkeleton columns={6} rows={10} />
        ) : eleitores.length === 0 ? (
          <EmptyState
            icon={Vote}
            title="Nenhum eleitor cadastrado"
            description="Cadastre seu primeiro eleitor ou importe uma planilha CSV."
            actionLabel="Novo eleitor"
            onAction={openCreate}
          />
        ) : (
          <>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Telefone</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Bairro</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Zona</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Apoio</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Origem</th>
                    <th className="text-right p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {eleitores.map((e) => {
                    const nivel = getNivel(e.nivel_apoio);
                    return (
                      <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                {e.nome_completo.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-[13px] font-medium">{e.nome_completo}</p>
                              {e.cpf && <p className="text-[11px] text-muted-foreground">{e.cpf}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-[13px] text-muted-foreground font-mono">{e.telefone || '—'}</td>
                        <td className="p-3 text-[13px] text-muted-foreground">{e.bairro || '—'}</td>
                        <td className="p-3 text-[13px] text-muted-foreground">{e.zona_eleitoral || '—'}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-[11px] font-medium ${nivel.color}`}>
                            {nivel.label}
                          </Badge>
                        </td>
                        <td className="p-3 text-[13px] text-muted-foreground">{e.origem || '—'}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteTarget(e)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">Página {page} de {pages} ({total} eleitores)</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal criar/editar eleitor */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar eleitor' : 'Novo eleitor'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome completo *</Label>
              <Input value={form.nome_completo} onChange={(e) => setForm({...form, nome_completo: e.target.value})} placeholder="Nome completo do eleitor" />
            </div>
            <div className="space-y-1.5">
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={(e) => setForm({...form, cpf: e.target.value})} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} placeholder="83999999999" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Data de nascimento</Label>
              <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({...form, data_nascimento: e.target.value})} />
            </div>

            <div className="col-span-2 border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Dados eleitorais</p>
            </div>
            <div className="space-y-1.5">
              <Label>Título de eleitor</Label>
              <Input value={form.titulo_eleitor} onChange={(e) => setForm({...form, titulo_eleitor: e.target.value})} placeholder="Nº título" />
            </div>
            <div className="space-y-1.5">
              <Label>Zona eleitoral</Label>
              <Input value={form.zona_eleitoral} onChange={(e) => setForm({...form, zona_eleitoral: e.target.value})} placeholder="Ex: 042" />
            </div>
            <div className="space-y-1.5">
              <Label>Seção eleitoral</Label>
              <Input value={form.secao_eleitoral} onChange={(e) => setForm({...form, secao_eleitoral: e.target.value})} placeholder="Ex: 0150" />
            </div>

            <div className="col-span-2 border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Endereço</p>
            </div>
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input value={form.cep} onChange={(e) => setForm({...form, cep: e.target.value})} placeholder="58400-000" />
            </div>
            <div className="space-y-1.5">
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={(e) => setForm({...form, bairro: e.target.value})} placeholder="Centro" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm({...form, endereco: e.target.value})} placeholder="Rua, número" />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({...form, cidade: e.target.value})} placeholder="Campina Grande" />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Input value={form.estado} onChange={(e) => setForm({...form, estado: e.target.value})} placeholder="PB" maxLength={2} />
            </div>

            <div className="col-span-2 border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Classificação</p>
            </div>
            <div className="space-y-1.5">
              <Label>Nível de apoio</Label>
              <Select value={form.nivel_apoio} onValueChange={(v) => setForm({...form, nivel_apoio: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NIVEIS_APOIO.map(n => <SelectItem key={n.value} value={String(n.value)}>{n.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select value={form.origem || 'none'} onValueChange={(v) => setForm({...form, origem: v === 'none' ? '' : v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {liderancas.length > 0 && (
              <div className="space-y-1.5">
                <Label>Liderança responsável</Label>
                <Select value={form.lideranca_id || 'none'} onValueChange={(v) => setForm({...form, lideranca_id: v === 'none' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {liderancas.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({...form, observacoes: e.target.value})} placeholder="Anotações sobre o eleitor..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : editId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!deleteTarget}
        title="Excluir eleitor"
        message={`Tem certeza que deseja excluir ${deleteTarget?.nome_completo}?`}
        confirmLabel={deleting ? 'Excluindo...' : 'Excluir'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </AppShell>
  );
}
