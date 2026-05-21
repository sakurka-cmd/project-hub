'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Artifact } from '@/types';
import {
  ARTIFACT_TYPE_LABELS,
  ARTIFACT_TYPES,
  truncate,
  formatDate,
} from '@/lib/constants';
import { Plus, MoreHorizontal, Pencil, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface ArtifactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  artifact?: Artifact | null;
}

function ArtifactDialog({ open, onOpenChange, mode, artifact }: ArtifactDialogProps) {
  const selectedProjectId = useAppStore(s => s.selectedProjectId);
  const createArtifact = useAppStore(s => s.createArtifact);
  const updateArtifact = useAppStore(s => s.updateArtifact);
  const { toast } = useToast();

  const [title, setTitle] = useState(artifact?.title || '');
  const [description, setDescription] = useState(artifact?.description || '');
  const [type, setType] = useState(artifact?.type || 'document');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === 'edit' && artifact;

  const handleReset = () => {
    setTitle(artifact?.title || '');
    setDescription(artifact?.description || '');
    setType(artifact?.type || 'document');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !selectedProjectId) return;
    setSubmitting(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim() || null,
        type: type as Artifact['type'],
        projectId: selectedProjectId,
      };
      if (isEdit) {
        await updateArtifact(artifact.id, data);
        toast({ title: 'Артефакт обновлён' });
      } else {
        await createArtifact(data);
        toast({ title: 'Артефакт создан' });
      }
      onOpenChange(false);
      handleReset();
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить артефакт', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать артефакт' : 'Новый артефакт'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Измените параметры артефакта' : 'Добавьте артефакт в текущий проект'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="artifact-title">Название *</Label>
            <Input
              id="artifact-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Название артефакта"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artifact-type">Тип</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARTIFACT_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{ARTIFACT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="artifact-desc">Описание</Label>
            <Textarea
              id="artifact-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Описание (необязательно)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || submitting}>
            {submitting ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ArtifactList() {
  const artifacts = useAppStore(s => s.artifacts);
  const deleteArtifact = useAppStore(s => s.deleteArtifact);
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Artifact | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteArtifact(deleteTarget.id);
      toast({ title: 'Артефакт удалён' });
      setDeleteTarget(null);
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить артефакт', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Артефакты</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить артефакт
        </Button>
      </div>

      {artifacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">Нет артефактов</p>
          <p className="text-sm text-muted-foreground mt-1">
            Добавьте первый артефакт в проект
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Название</TableHead>
                  <TableHead className="min-w-[100px]">Тип</TableHead>
                  <TableHead className="min-w-[200px] hidden md:table-cell">Описание</TableHead>
                  <TableHead className="min-w-[100px] hidden sm:table-cell">Дата</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {artifacts.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ARTIFACT_TYPE_LABELS[a.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {truncate(a.description, 60)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">
                      {formatDate(a.createdAt)}
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
                          <DropdownMenuItem onClick={() => setEditingArtifact(a)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(a)}
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

      <ArtifactDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      {editingArtifact && (
        <ArtifactDialog
          open={!!editingArtifact}
          onOpenChange={(v) => { if (!v) setEditingArtifact(null); }}
          mode="edit"
          artifact={editingArtifact}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить артефакт?</AlertDialogTitle>
            <AlertDialogDescription>
              Артефакт «{deleteTarget?.title}» будет удалён без возможности восстановления.
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
