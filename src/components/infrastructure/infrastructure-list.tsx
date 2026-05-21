'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { InfrastructureItem } from '@/types';
import {
  INFRA_TYPE_LABELS,
  INFRA_TYPE_COLORS,
  INFRA_TYPES,
  truncate,
  formatDate,
} from '@/lib/constants';
import { Plus, MoreHorizontal, Pencil, Trash2, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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

interface InfraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  item?: InfrastructureItem | null;
}

export function InfraDialog({ open, onOpenChange, mode, item }: InfraDialogProps) {
  const selectedProjectId = useAppStore(s => s.selectedProjectId);
  const createInfrastructure = useAppStore(s => s.createInfrastructure);
  const updateInfrastructure = useAppStore(s => s.updateInfrastructure);
  const { toast } = useToast();

  const [name, setName] = useState(item?.name || '');
  const [type, setType] = useState(item?.type || 'server');
  const [host, setHost] = useState(item?.host || '');
  const [port, setPort] = useState(item?.port || '');
  const [credentials, setCredentials] = useState(item?.credentials || '');
  const [description, setDescription] = useState(item?.description || '');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === 'edit' && item;

  const handleReset = () => {
    setName(item?.name || '');
    setType(item?.type || 'server');
    setHost(item?.host || '');
    setPort(item?.port || '');
    setCredentials(item?.credentials || '');
    setDescription(item?.description || '');
  };

  const handleSubmit = async () => {
    if (!name.trim() || !selectedProjectId) return;
    setSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        type: type as InfrastructureItem['type'],
        host: host.trim() || null,
        port: port.trim() || null,
        credentials: credentials.trim() || null,
        description: description.trim() || null,
        projectId: selectedProjectId,
      };
      if (isEdit) {
        await updateInfrastructure(item.id, data);
        toast({ title: 'Элемент обновлён' });
      } else {
        await createInfrastructure(data);
        toast({ title: 'Элемент добавлен' });
      }
      onOpenChange(false);
      handleReset();
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать' : 'Новый элемент'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Измените параметры элемента инфраструктуры' : 'Добавьте элемент инфраструктуры'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="infra-name">Название *</Label>
            <Input
              id="infra-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Название"
            />
          </div>

          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INFRA_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{INFRA_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="infra-host">Хост</Label>
              <Input
                id="infra-host"
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder="192.168.1.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="infra-port">Порт</Label>
              <Input
                id="infra-port"
                value={port}
                onChange={e => setPort(e.target.value)}
                placeholder="8080"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="infra-cred">Учётные данные</Label>
            <Input
              id="infra-cred"
              value={credentials}
              onChange={e => setCredentials(e.target.value)}
              placeholder="root / password (необязательно)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="infra-desc">Описание</Label>
            <Textarea
              id="infra-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Описание (необязательно)"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || submitting}>
            {submitting ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InfrastructureList() {
  const infrastructure = useAppStore(s => s.infrastructure);
  const deleteInfrastructure = useAppStore(s => s.deleteInfrastructure);
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InfrastructureItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InfrastructureItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInfrastructure(deleteTarget.id);
      toast({ title: 'Элемент удалён' });
      setDeleteTarget(null);
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить элемент', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Инфраструктура</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {infrastructure.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Server className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">Нет элементов инфраструктуры</p>
          <p className="text-sm text-muted-foreground mt-1">
            Добавьте серверы, базы данных и другие ресурсы
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {infrastructure.map(item => (
            <Card key={item.id} className="py-0 relative">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm">{item.name}</h3>
                    {item.host && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {item.host}{item.port ? `:${item.port}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${INFRA_TYPE_COLORS[item.type] || ''}`}
                    >
                      {INFRA_TYPE_LABELS[item.type]}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingItem(item)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}
                {item.credentials && (
                  <div className="rounded-md bg-muted px-2 py-1">
                    <p className="text-[10px] text-muted-foreground">
                      {item.credentials}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InfraDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      {editingItem && (
        <InfraDialog
          open={!!editingItem}
          onOpenChange={(v) => { if (!v) setEditingItem(null); }}
          mode="edit"
          item={editingItem}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить элемент?</AlertDialogTitle>
            <AlertDialogDescription>
              «{deleteTarget?.name}» будет удалён без возможности восстановления.
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
