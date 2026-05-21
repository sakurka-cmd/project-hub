'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Credential } from '@/types';
import { Plus, MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Copy, KeyRound, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface CredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  credential?: Credential | null;
}

function CredentialDialog({ open, onOpenChange, mode, credential }: CredentialDialogProps) {
  const selectedProjectId = useAppStore(s => s.selectedProjectId);
  const createCredential = useAppStore(s => s.createCredential);
  const updateCredential = useAppStore(s => s.updateCredential);
  const { toast } = useToast();

  const [service, setService] = useState(credential?.service || '');
  const [username, setUsername] = useState(credential?.username || '');
  const [password, setPassword] = useState(credential?.password || '');
  const [url, setUrl] = useState(credential?.url || '');
  const [notes, setNotes] = useState(credential?.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === 'edit' && credential;

  const handleReset = () => {
    setService(credential?.service || '');
    setUsername(credential?.username || '');
    setPassword(credential?.password || '');
    setUrl(credential?.url || '');
    setNotes(credential?.notes || '');
  };

  const handleSubmit = async () => {
    if (!service.trim() || !username.trim() || !password.trim() || !selectedProjectId) return;
    setSubmitting(true);
    try {
      const data = {
        service: service.trim(),
        username: username.trim(),
        password,
        url: url.trim() || null,
        notes: notes.trim() || null,
        projectId: selectedProjectId,
      };
      if (isEdit) {
        await updateCredential(credential.id, data);
        toast({ title: 'Запись обновлена' });
      } else {
        await createCredential(data);
        toast({ title: 'Запись создана' });
      }
      onOpenChange(false);
      handleReset();
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить запись', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать запись' : 'Новая учётная запись'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Измените параметры записи' : 'Добавьте учётные данные'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cred-service">Сервис *</Label>
            <Input
              id="cred-service"
              value={service}
              onChange={e => setService(e.target.value)}
              placeholder="Название сервиса"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cred-user">Имя пользователя *</Label>
              <Input
                id="cred-user"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-pass">Пароль *</Label>
              <Input
                id="cred-pass"
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Пароль"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-url">URL</Label>
            <Input
              id="cred-url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com (необязательно)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-notes">Заметки</Label>
            <Textarea
              id="cred-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Дополнительные заметки"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!service.trim() || !username.trim() || !password.trim() || submitting}>
            {submitting ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function maskPassword(pass: string): string {
  if (pass.length <= 4) return '••••';
  return pass.slice(0, 2) + '•'.repeat(Math.min(pass.length - 2, 12));
}

export function CredentialList() {
  const credentials = useAppStore(s => s.credentials);
  const deleteCredential = useAppStore(s => s.deleteCredential);
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<Credential | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Credential | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Скопировано в буфер обмена' });
    } catch {
      toast({ title: 'Ошибка копирования', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCredential(deleteTarget.id);
      toast({ title: 'Запись удалена' });
      setDeleteTarget(null);
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить запись', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Учётные записи</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить запись
        </Button>
      </div>

      {credentials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <KeyRound className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">Нет учётных записей</p>
          <p className="text-sm text-muted-foreground mt-1">
            Добавьте первую запись для хранения данных
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Сервис</TableHead>
                  <TableHead className="min-w-[150px]">Имя пользователя</TableHead>
                  <TableHead className="min-w-[200px]">Пароль</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{c.service}</span>
                        {c.url && (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {c.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{c.notes}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{c.username}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm">
                          {revealedIds.has(c.id) ? c.password : maskPassword(c.password)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => toggleReveal(c.id)}
                        >
                          {revealedIds.has(c.id) ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleCopy(c.password)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Действия</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingCred(c)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <CredentialDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      {editingCred && (
        <CredentialDialog
          open={!!editingCred}
          onOpenChange={(v) => { if (!v) setEditingCred(null); }}
          mode="edit"
          credential={editingCred}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Учётная запись «{deleteTarget?.service}» будет удалена без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
