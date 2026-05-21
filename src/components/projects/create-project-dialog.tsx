'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { PROJECT_STATUS_LABELS, PRESET_COLORS, PROJECT_STATUSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    status: string;
  } | null;
  mode?: 'create' | 'edit';
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  initialData,
  mode = 'create',
}: CreateProjectDialogProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [color, setColor] = useState(initialData?.color || PRESET_COLORS[0]);
  const [status, setStatus] = useState(initialData?.status || 'active');
  const [submitting, setSubmitting] = useState(false);

  const createProject = useAppStore(s => s.createProject);
  const updateProject = useAppStore(s => s.updateProject);
  const { toast } = useToast();

  const isEdit = mode === 'edit' && initialData;

  const handleReset = () => {
    setName(initialData?.name || '');
    setDescription(initialData?.description || '');
    setColor(initialData?.color || PRESET_COLORS[0]);
    setStatus(initialData?.status || 'active');
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateProject(initialData.id, { name: name.trim(), description: description.trim() || null, color, status });
        toast({ title: 'Проект обновлён' });
      } else {
        await createProject({ name: name.trim(), description: description.trim() || null, color, status });
        toast({ title: 'Проект создан' });
      }
      onOpenChange(false);
      handleReset();
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить проект', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Редактировать проект' : 'Новый проект'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Измените параметры проекта' : 'Заполните информацию о новом проекте'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="project-name">Название *</Label>
            <Input
              id="project-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Введите название проекта"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-desc">Описание</Label>
            <Textarea
              id="project-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Описание проекта (необязательно)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Цвет</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    'h-7 w-7 rounded-full transition-all',
                    color === c ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || submitting}>
            {submitting ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
