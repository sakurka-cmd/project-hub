'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Sprint } from '@/types';
import {
  SPRINT_STATUS_LABELS,
  SPRINT_STATUS_COLORS,
  SPRINT_STATUSES,
  formatDate,
} from '@/lib/constants';
import {
  Plus,
  Calendar,
  ChevronRight,
  Trash2,
  Pencil,
  Check,
  X,
  FolderKanban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function SprintCard({
  sprint,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  sprint: Sprint;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="py-0 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <FolderKanban className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{sprint.name}</h3>
              <p className="text-[11px] text-muted-foreground">
                {sprint.startDate
                  ? `${formatDate(sprint.startDate)}${sprint.endDate ? ` — ${formatDate(sprint.endDate)}` : ''}`
                  : 'Даты не заданы'}
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={cn('text-[10px] px-1.5 py-0 shrink-0', SPRINT_STATUS_COLORS[sprint.status] || '')}
          >
            {SPRINT_STATUS_LABELS[sprint.status]}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FolderKanban className="h-3 w-3" />
            <span>{sprint._count?.tasks ?? 0} задач</span>
          </div>

          {/* Status toggle */}
          <Select value={sprint.status} onValueChange={onStatusChange}>
            <SelectTrigger size="sm" className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPRINT_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{SPRINT_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateSprintForm({
  projectId,
  onCancel,
}: {
  projectId: string;
  onCancel: () => void;
}) {
  const createSprint = useAppStore(s => s.createSprint);
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createSprint({
        name: name.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        status: 'planning',
        projectId,
      });
      toast({ title: 'Спринт создан' });
      onCancel();
    } catch {
      toast({ title: 'Ошибка', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-dashed border-primary/30 py-0">
      <CardContent className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Новый спринт</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Название спринта"
            className="sm:col-span-1"
            autoFocus
          />
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            placeholder="Дата начала"
          />
          <Input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            placeholder="Дата окончания"
          />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Отмена</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!name.trim() || submitting}>
            {submitting ? 'Создание...' : 'Создать'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SprintList() {
  const sprints = useAppStore(s => s.sprints);
  const selectedProjectId = useAppStore(s => s.selectedProjectId);
  const updateSprint = useAppStore(s => s.updateSprint);
  const deleteSprint = useAppStore(s => s.deleteSprint);
  const loading = useAppStore(s => s.loading);
  const { toast } = useToast();

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateSprint(id, { status: status as Sprint['status'] });
      toast({ title: 'Статус обновлён' });
    } catch {
      toast({ title: 'Ошибка', variant: 'destructive' });
    }
  };

  const handleStartEdit = (sprint: Sprint) => {
    setEditingId(sprint.id);
    setEditName(sprint.name);
    setEditStart(sprint.startDate ? sprint.startDate.slice(0, 10) : '');
    setEditEnd(sprint.endDate ? sprint.endDate.slice(0, 10) : '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateSprint(editingId, {
        name: editName.trim(),
        startDate: editStart ? new Date(editStart).toISOString() : null,
        endDate: editEnd ? new Date(editEnd).toISOString() : null,
      });
      toast({ title: 'Спринт обновлён' });
      setEditingId(null);
    } catch {
      toast({ title: 'Ошибка', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deleteSprint(deletingId);
      toast({ title: 'Спринт удалён' });
      setDeleteOpen(false);
      setDeletingId(null);
    } catch {
      toast({ title: 'Ошибка', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  const deletingSprint = sprints.find(s => s.id === deletingId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Спринты</h2>
          <p className="text-sm text-muted-foreground">
            {sprints.length} {sprints.length === 1 ? 'спринт' : sprints.length >= 2 && sprints.length <= 4 ? 'спринта' : 'спринтов'}
          </p>
        </div>
        {!creating && selectedProjectId && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать спринт
          </Button>
        )}
      </div>

      {/* Create form */}
      {creating && selectedProjectId && (
        <CreateSprintForm
          projectId={selectedProjectId}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Sprint cards - timeline style */}
      {sprints.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Спринтов пока нет. Создайте первый спринт.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sprints.map(sprint => (
            editingId === sprint.id ? (
              <Card key={sprint.id} className="border-primary/30 py-0">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Название спринта"
                      autoFocus
                    />
                    <Input
                      type="date"
                      value={editStart}
                      onChange={e => setEditStart(e.target.value)}
                    />
                    <Input
                      type="date"
                      value={editEnd}
                      onChange={e => setEditEnd(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4 mr-1" /> Отмена
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={!editName.trim()}>
                      <Check className="h-4 w-4 mr-1" /> Сохранить
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                onStatusChange={(status) => handleStatusChange(sprint.id, status)}
                onEdit={() => handleStartEdit(sprint)}
                onDelete={() => { setDeletingId(sprint.id); setDeleteOpen(true); }}
              />
            )
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteOpen(false)}>
          <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Удалить спринт?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Спринт «{deletingSprint?.name}» будет удалён. Задачи не будут удалены.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>Отмена</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Удаление...' : 'Удалить'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
