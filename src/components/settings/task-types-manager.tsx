'use client';

import { useState } from 'react';
import type { TaskType } from '@/types';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { PRESET_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';

interface TaskTypesManagerProps {
  taskTypes: TaskType[];
  onTypesChanged: () => void;
}

export function TaskTypesManager({ taskTypes, onTypesChanged }: TaskTypesManagerProps) {
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editType, setEditType] = useState<TaskType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null);
  const typeToDelete = taskTypes.find((t) => t.id === deleteTypeId);

  const openCreate = () => {
    setEditType(null);
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0]);
    setDialogOpen(true);
  };

  const openEdit = (type: TaskType) => {
    setEditType(type);
    setName(type.name);
    setDescription(type.description || '');
    setColor(type.color);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: 'Ошибка', description: 'Введите название типа', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: trimmedName,
        description: description.trim() || null,
        color,
      };
      if (editType) {
        await api.updateTaskType(editType.id, data);
        toast({ title: 'Тип обновлён' });
      } else {
        await api.createTaskType(data);
        toast({ title: 'Тип создан' });
      }
      setDialogOpen(false);
      onTypesChanged();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTypeId) return;
    try {
      await api.deleteTaskType(deleteTypeId);
      toast({ title: 'Тип удалён' });
      setDeleteTypeId(null);
      onTypesChanged();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось удалить', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Цветовые метки для категоризации задач
        </p>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Добавить тип
        </Button>
      </div>

      {taskTypes.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
          <p>Нет типов задач</p>
          <p className="text-xs mt-1">Создайте тип задачи для цветовой метки</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {taskTypes.map((type) => (
            <div key={type.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: type.color }} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{type.name}</span>
                {type.description && <p className="text-xs text-muted-foreground truncate">{type.description}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEdit(type)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTypeId(type.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editType ? 'Редактировать тип задачи' : 'Новый тип задачи'}</DialogTitle>
            <DialogDescription>
              {editType ? 'Измените параметры типа' : 'Создайте цветовую метку для задач'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Название</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Баг, Фича, Документация" autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Описание</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Краткое описание..." rows={2} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Цвет</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button key={c} className={cn('h-6 w-6 rounded-full border-2 transition-all', color === c ? 'border-foreground scale-110' : 'border-transparent hover:border-muted-foreground/50')} style={{ backgroundColor: c }} onClick={() => setColor(c)} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Сохранение...</> : editType ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTypeId} onOpenChange={(v) => !v && setDeleteTypeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тип «{typeToDelete?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>Существующие задачи не будут удалены, но потеряют цветовую метку.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
