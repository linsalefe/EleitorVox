'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import AppShell from '@/components/app-shell';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  UserPlus, Shield, User, Mail, Loader2, Eye, EyeOff, X,
  AlertCircle, Lock, Users, Pencil, Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface UserInfo {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
}

const ROLES = [
  { value: 'admin', label: 'Administrador', color: 'bg-purple-50 text-purple-700' },
  { value: 'atendente', label: 'Atendente', color: 'bg-blue-50 text-blue-700' },
  { value: 'lideranca', label: 'Liderança', color: 'bg-orange-50 text-orange-700' },
];

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('atendente');

  useEffect(() => {
    if (user && !['admin', 'superadmin'].includes(user.role)) router.push('/dashboard');
    if (user) loadUsers();
  }, [user]);

  const loadUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch { toast.error('Erro ao carregar usuários'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditUser(null);
    setFormName(''); setFormEmail(''); setFormPassword(''); setFormRole('atendente');
    setError('');
    setShowModal(true);
  };

  const openEdit = (u: UserInfo) => {
    setEditUser(u);
    setFormName(u.name); setFormEmail(u.email); setFormPassword(''); setFormRole(u.role);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) return setError('Nome e email são obrigatórios');
    if (!editUser && !formPassword.trim()) return setError('Senha é obrigatória para novos usuários');
    setSaving(true);
    setError('');
    try {
      if (editUser) {
        const payload: any = { name: formName, email: formEmail, role: formRole };
        if (formPassword.trim()) payload.password = formPassword;
        await api.put(`/auth/users/${editUser.id}`, payload);
        toast.success('Usuário atualizado');
      } else {
        await api.post('/auth/register', {
          name: formName, email: formEmail, password: formPassword, role: formRole,
        });
        toast.success('Usuário criado');
      }
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const toggleActive = async (u: UserInfo) => {
    try {
      await api.put(`/auth/users/${u.id}`, { is_active: !u.is_active });
      loadUsers();
    } catch { toast.error('Erro ao alterar status'); }
  };

  const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[1];
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getAvatarColor = (name: string) => {
    const c = ['from-blue-500 to-blue-600','from-purple-500 to-purple-600','from-emerald-500 to-emerald-600','from-orange-500 to-orange-600','from-pink-500 to-pink-600'];
    return c[name.charCodeAt(0) % c.length];
  };

  const activeCount = users.filter(u => u.is_active).length;
  const liderancaCount = users.filter(u => u.role === 'lideranca').length;

  return (
    <AppShell>
      <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto pb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground mb-0.5">Administração</p>
            <h1 className="text-xl lg:text-2xl font-semibold text-foreground tracking-tight">Usuários</h1>
          </div>
          <Button onClick={openCreate}><UserPlus className="w-4 h-4 mr-2" /> Novo usuário</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <div className="bg-card rounded-2xl p-3 lg:p-4 border flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center"><Users className="w-4 h-4 text-blue-600" /></div>
            <div><p className="text-lg font-bold">{users.length}</p><p className="text-[11px] text-muted-foreground">Total</p></div>
          </div>
          <div className="bg-card rounded-2xl p-3 lg:p-4 border flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center"><User className="w-4 h-4 text-emerald-600" /></div>
            <div><p className="text-lg font-bold">{activeCount}</p><p className="text-[11px] text-muted-foreground">Ativos</p></div>
          </div>
          <div className="bg-card rounded-2xl p-3 lg:p-4 border flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center"><Crown className="w-4 h-4 text-orange-600" /></div>
            <div><p className="text-lg font-bold">{liderancaCount}</p><p className="text-[11px] text-muted-foreground">Lideranças</p></div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-card rounded-2xl border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
          ) : (
            <div>
              <div className="hidden sm:grid grid-cols-[1fr_120px_100px_120px] px-6 py-3 border-b bg-muted/50">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Usuário</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Função</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Ações</span>
              </div>
              {users.map((u) => {
                const roleInfo = getRoleInfo(u.role);
                return (
                  <div key={u.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_120px] items-center px-6 py-4 border-b last:border-0 hover:bg-muted/30 transition-colors gap-3 sm:gap-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(u.name)} flex items-center justify-center text-white font-semibold text-xs shadow-sm ${!u.is_active ? 'opacity-40' : ''}`}>
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-medium text-[13px] truncate ${u.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {u.name} {u.id === user?.id && <span className="text-[10px] text-muted-foreground">(você)</span>}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[12px] text-muted-foreground truncate">{u.email}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${u.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => toggleActive(u)}
                          className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                            u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >{u.is_active ? 'Desativar' : 'Ativar'}</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Criar/Editar */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            </DialogHeader>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-1.5">
                <Label>{editUser ? 'Nova senha (deixe vazio para manter)' : 'Senha'}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder={editUser ? '••••••' : 'Mínimo 6 caracteres'}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Função</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {formRole === 'lideranca' && (
                  <p className="text-[12px] text-muted-foreground">Um registro de Liderança será criado automaticamente.</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : editUser ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
