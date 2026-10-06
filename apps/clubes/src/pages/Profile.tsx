import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Baby, Camera, ChevronRight, EyeOff, FileText, LogOut, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@riff/core/supabase/client';
import { useAuth } from '@riff/core/hooks/useAuth';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Avatar, BrandLines } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { Switch } from '@riff/core/ui/switch';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@riff/core/ui/alert-dialog';
import { CLUBES_LEGAL_DOCUMENTS } from '@riff/core/legal/clubes';
import { errorMessage } from '@riff/core/lib/utils';
import { uploadAvatar } from '@riff/core/lib/avatar';
import { useDependents } from '@/hooks/useDependents';
import { usePlayerProfile } from '@/hooks/useSports';
import { SportsProfileView, StatsTicket } from '@/components/SportsProfileView';

const ROW = 'flex items-center gap-3 px-4 py-3.5 text-sm text-ink';

export default function Profile() {
  const { user } = useAuth();
  const { profile, updateProfile, isUpdating } = useProfile();
  const { data: dependents } = useDependents();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: sports, refetch: refetchSports } = usePlayerProfile(profile?.id);
  const hidden = !!profile?.sports_hidden;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile?.id) return;
    setIsUploading(true);
    try {
      const url = await uploadAvatar(profile.id, file);
      await updateProfile({ avatar_url: url });
      toast.success('Foto atualizada.');
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível trocar a foto.'));
    } finally {
      setIsUploading(false);
    }
  };

  const toggleHidden = async (value: boolean) => {
    try {
      await updateProfile({ sports_hidden: value });
      await refetchSports();
      toast.success(value ? 'Modo reservado ligado. Você saiu do ranking e do perfil público.' : 'Modo reservado desligado. Você volta a aparecer para a comunidade.');
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível mudar o modo reservado.'));
    }
  };

  const saveName = async () => {
    if (name.trim().length < 2) return toast.error('Informe seu nome.');
    try {
      await updateProfile({ full_name: name.trim() });
      toast.success('Nome atualizado.');
      setEditing(false);
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível salvar.'));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Mesma exclusão do Riff Pro (uma conta para os dois apps): anonimiza o perfil,
  // apaga dependentes e dados privados e remove o login.
  const handleDelete = async () => {
    if (typed !== 'EXCLUIR') return;
    setIsDeleting(true);
    try {
      if (profile?.id) {
        const { data: files } = await supabase.storage.from('avatars').list('', { search: profile.id });
        const paths = (files ?? []).map((f) => f.name).filter((n) => n.startsWith(`${profile.id}-`));
        if (paths.length) await supabase.storage.from('avatars').remove(paths);
      }
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível excluir a conta.'));
      setIsDeleting(false);
    }
  };

  return (
    <PageContainer>
      {/* Cabeçalho de destaque: foto, nome e desde quando joga */}
      <section className="relative overflow-hidden bg-surface border-b border-line pb-14">
        <BrandLines className="absolute inset-y-0 right-0 h-full w-3/4" />
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        <div className="relative px-6 pt-safe pt-8 flex flex-col items-center text-center gap-2">
          <div className="relative">
            <Avatar src={profile?.avatar_url} name={profile?.full_name} className="w-24 h-24 ring-4 ring-bg" fallbackClassName="text-3xl" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              aria-label="Trocar foto"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-brand text-brand-ink flex items-center justify-center ring-4 ring-surface active:scale-95 disabled:opacity-60"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
          {editing ? (
            <div className="w-full flex gap-2 mt-1">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="h-11 bg-bg border-line" autoFocus />
              <Button onClick={saveName} disabled={isUpdating}>
                Salvar
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setName(profile?.full_name ?? '');
                setEditing(true);
              }}
              className="flex items-center gap-2 type-title mt-1"
            >
              {profile?.full_name || 'Seu nome'} <Pencil className="w-4 h-4 text-ink-muted" aria-label="Editar nome" />
            </button>
          )}
          <p className="text-xs text-ink-muted">
            {sports?.member_since
              ? `Jogando com a comunidade desde ${format(parseISO(sports.member_since), "MMMM 'de' yyyy", { locale: ptBR })}`
              : user?.email}
          </p>
          {hidden && (
            <span className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-elevated border border-line text-xs font-semibold text-ink-muted">
              <EyeOff className="w-3.5 h-3.5" /> Modo reservado
            </span>
          )}
        </div>
      </section>

      {sports && <StatsTicket p={sports} />}

      <div className="px-6 py-6 space-y-6">
        {sports && <SportsProfileView p={sports} self />}

        <section className="space-y-2">
          <h2 className="type-label">Conta</h2>
          <label className="flex items-center gap-3 bg-surface border border-line rounded-2xl px-4 py-3.5 cursor-pointer">
            <EyeOff className="w-5 h-5 text-ink-muted shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm text-ink">Modo reservado</span>
              <span className="block text-xs text-ink-muted">
                Fica fora do ranking, ninguém abre seu perfil e você aparece como "Membro". Seus números continuam aqui.
              </span>
            </span>
            <Switch checked={hidden} onCheckedChange={toggleHidden} disabled={isUpdating} />
          </label>
        </section>

        <div className="bg-surface border border-line rounded-2xl divide-y divide-line">
          <Link to="/dependentes" className={ROW}>
            <Baby className="w-5 h-5 text-brand" />
            <span className="flex-1">Seus dependentes</span>
            <span className="text-xs text-ink-muted">{dependents?.length ?? 0}</span>
            <ChevronRight className="w-4 h-4 text-ink-muted" />
          </Link>
        </div>

        <div className="bg-surface border border-line rounded-2xl divide-y divide-line">
          {[CLUBES_LEGAL_DOCUMENTS.clubes_terms, CLUBES_LEGAL_DOCUMENTS.clubes_privacy, CLUBES_LEGAL_DOCUMENTS.guardian_consent].map((doc) => (
            <Link key={doc.id} to={doc.path} className={ROW}>
              {doc.id === 'clubes_privacy' ? <ShieldCheck className="w-5 h-5 text-ink-muted" /> : <FileText className="w-5 h-5 text-ink-muted" />}
              <span className="flex-1">{doc.title}</span>
              <ChevronRight className="w-4 h-4 text-ink-muted" />
            </Link>
          ))}
        </div>

        <div className="bg-surface border border-line rounded-2xl divide-y divide-line">
          <button type="button" onClick={handleLogout} className={`${ROW} w-full`}>
            <LogOut className="w-5 h-5 text-ink-muted" />
            <span className="flex-1 text-left">Sair</span>
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)} className={`${ROW} w-full text-danger`}>
            <Trash2 className="w-5 h-5" />
            <span className="flex-1 text-left">Excluir minha conta</span>
          </button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="bg-surface border-line sm:rounded-3xl gap-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-ink">Excluir sua conta?</AlertDialogTitle>
            <AlertDialogDescription className="text-ink-muted space-y-2">
              A conta é a mesma do Riff Pro: ela sai dos dois apps. Suas inscrições futuras são canceladas, você sai das
              comunidades e os dados dos seus dependentes são apagados. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block space-y-2">
            <span className="text-sm text-ink">
              Digite <strong>EXCLUIR</strong> para confirmar
            </span>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} className="h-11 bg-elevated border-line" />
          </label>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-elevated border-line">Voltar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={typed !== 'EXCLUIR' || isDeleting}>
              {isDeleting ? 'Excluindo…' : 'Excluir conta'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
