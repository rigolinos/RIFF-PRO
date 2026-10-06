import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Baby, ChevronRight, FileText, LogOut, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@riff/core/supabase/client';
import { useAuth } from '@riff/core/hooks/useAuth';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Avatar } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
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
import { useDependents } from '@/hooks/useDependents';

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
    <PageContainer title="Perfil">
      <div className="px-6 py-6 space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <Avatar src={profile?.avatar_url} name={profile?.full_name} className="w-20 h-20" fallbackClassName="text-2xl" />
          {editing ? (
            <div className="w-full flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="h-11 bg-surface border-line" autoFocus />
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
              className="flex items-center gap-2 type-title"
            >
              {profile?.full_name || 'Seu nome'} <Pencil className="w-4 h-4 text-ink-muted" aria-label="Editar nome" />
            </button>
          )}
          <p className="text-sm text-ink-muted">{user?.email}</p>
          <p className="text-xs text-ink-muted">A mesma conta vale no Riff Pro.</p>
        </div>

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
