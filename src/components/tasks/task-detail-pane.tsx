'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Task } from '@/types';
import {
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  PRIORITY_LABELS,
  PRIORITIES,
  WORK_ITEM_TYPE_LABELS,
  WORK_ITEM_TYPES,
  WORK_ITEM_TYPE_COLORS,
  WORK_ITEM_TYPE_PREFIX,
  CHILD_TYPE_FOR_PARENT,
  getShortId,
} from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Plus, Trash2 } from 'lucide-react';

interface TaskDetailPaneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

export function TaskDetailPane({ open, onOpenChange, task }: TaskDetailPaneProps) {
  const categories = useAppStore(s => s.categories);
  const sprints = useAppStore(s => s.sprints);
  const updateTask = useAppStore(s => s.updateTask);
  const deleteTask = useAppStore(s => s.deleteTask);
  const createTask = useAppStore(s => s.createTask);
  const selectedProjectId = useAppStore(s => s.selectedProjectId);
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [workItemType, setWorkItemType] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [childTitle, setChildTitle] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setWorkItemType(task.workItemType);
      setSprintId(task.sprintId || '');
      setCategoryId(task.categoryId || '');
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
      setDeleteOpen(false);
      setAddingChild(false);
      setChildTitle('');
    }
  }, [task]);

  const handleSubmit = async () => {
    if (!task || !title.trim()) return;
    setSubmitting(true);
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        status: status as Task['status'],
        priority: priority as Task['priority'],
        workItemType: workItemType as Task['workItemType'],
        sprintId: sprintId || null,
        categoryId: categoryId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      toast({ title: 'Элемент обновлён' });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось обновить', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      toast({ title: 'Элемент удалён' });
      setDeleteOpen(false);
      onOpenChange(false);
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleAddChild = async () => {
    if (!task || !childTitle.trim() || !selectedProjectId) return;
    try {
      const childType = CHILD_TYPE_FOR_PARENT[task.workItemType] || 'task';
      await createTask({
        title: childTitle.trim(),
        projectId: selectedProjectId,
        parentId: task.id,
        workItemType: childType,
        status: 'todo',
        priority: 'medium',
      });
      toast({ title: 'Дочерний элемент создан' });
      setChildTitle('');
      setAddingChild(false);
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось создать', variant: 'destructive' });
    }
  };

  const prefix = task ? WORK_ITEM_TYPE_PREFIX[task.workItemType] || 'TK' : 'TK';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pr-6">
            <SheetTitle className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{prefix}-{getShortId(task?.id || '')}</span>
              {task && (
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${WORK_ITEM_TYPE_COLORS[task.workItemType] || ''}`}>
                  {WORK_ITEM_TYPE_LABELS[task.workItemType] || task.workItemType}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {task && (
            <div className="mt-4 space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="pane-title">Название</Label>
                <Input
                  id="pane-title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={handleSubmit}
                  placeholder="Название элемента"
                />
              </div>

              {/* Work Item Type + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Тип</Label>
                  <Select value={workItemType} onValueChange={v => { setWorkItemType(v); handleSubmit(); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_ITEM_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{WORK_ITEM_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={status} onValueChange={v => { setStatus(v); handleSubmit(); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
                      ))}
                      <SelectItem value="cancelled">Отменено</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority + Sprint */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Приоритет</Label>
                  <Select value={priority} onValueChange={v => { setPriority(v); handleSubmit(); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Спринт</Label>
                  <Select value={sprintId} onValueChange={v => { setSprintId(v); handleSubmit(); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Без спринта" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без спринта</SelectItem>
                      {sprints.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Category + Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Категория</Label>
                  <Select value={categoryId} onValueChange={v => { setCategoryId(v); handleSubmit(); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Без категории" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без категории</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pane-due">Срок</Label>
                  <Input
                    id="pane-due"
                    type="date"
                    value={dueDate}
                    onChange={e => { setDueDate(e.target.value); handleSubmit(); }}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="pane-desc">Описание</Label>
                <Textarea
                  id="pane-desc"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={handleSubmit}
                  placeholder="Описание элемента"
                  rows={4}
                />
              </div>

              {/* Parent link */}
              {task.parent && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Родительский элемент</span>
                  <p className="text-sm text-muted-foreground">
                    {WORK_ITEM_TYPE_LABELS[task.parent.workItemType] || task.parent.workItemType}: {task.parent.title}
                  </p>
                </div>
              )}

              <Separator />

              {/* Add child */}
              <div className="space-y-2">
                {!addingChild ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingChild(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить дочерний элемент
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={childTitle}
                      onChange={e => setChildTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddChild();
                        if (e.key === 'Escape') { setAddingChild(false); setChildTitle(''); }
                      }}
                      placeholder={`Новый ${WORK_ITEM_TYPE_LABELS[CHILD_TYPE_FOR_PARENT[task.workItemType]] || 'элемент'}...`}
                      autoFocus
                    />
                    <Button size="sm" onClick={handleAddChild} disabled={!childTitle.trim()}>
                      OK
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingChild(false); setChildTitle(''); }}>
                      ✕
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Delete */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить элемент?</AlertDialogTitle>
            <AlertDialogDescription>
              «{task?.title}» и все дочерние элементы будут удалены без возможности восстановления.
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
    </>
  );
}
