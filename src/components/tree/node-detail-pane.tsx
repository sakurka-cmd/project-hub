'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProjectNode } from '@/types';
import { api } from '@/lib/api';
import { openExportTable } from '@/lib/export-table';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  Plus,
  X,
} from 'lucide-react';

interface NodeDetailPaneProps {
  node: ProjectNode | null;
  open: boolean;
  onClose: () => void;
}

interface FieldEntry {
  key: string;
  value: string;
  isNew?: boolean;
}

const BRANCH_TYPE_OPTIONS = [
  { value: '__none__', label: 'Без типа' },
  { value: 'tasks', label: 'Задачи' },
  { value: 'infrastructure', label: 'Инфраструктура' },
  { value: 'credentials', label: 'Учётные записи' },
  { value: 'artifacts', label: 'Артефакты' },
];

export function NodeDetailPane({ node, open, onClose }: NodeDetailPaneProps) {
  const { toast } = useToast();
  const updateNode = useAppStore((s) => s.updateNode);

  const [name, setName] = useState('');
  const [branchType, setBranchType] = useState<string>('__none__');
  const [fields, setFields] = useState<FieldEntry[]>([]);
  const [saving, setSaving] = useState(false);

  // Sync local state when node changes
  useEffect(() => {
    if (node) {
      setName(node.name);
      setBranchType(node.branchType || '__none__');
      setFields(
        Object.entries(node.fields).map(([key, value]) => ({
          key,
          value: String(value ?? ''),
        }))
      );
    }
  }, [node]);

  const isBranch = node?.nodeType === 'branch';

  const handleSave = useCallback(async () => {
    if (!node) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: 'Ошибка', description: 'Название не может быть пустым', variant: 'destructive' });
      return;
    }

    // Validate field keys (no duplicates, no empty)
    const fieldMap: Record<string, unknown> = {};
    for (const f of fields) {
      const k = f.key.trim();
      if (!k) {
        toast({ title: 'Ошибка', description: 'Имя поля не может быть пустым', variant: 'destructive' });
        return;
      }
      if (fieldMap.hasOwnProperty(k)) {
        toast({ title: 'Ошибка', description: `Дублирующее имя поля: "${k}"`, variant: 'destructive' });
        return;
      }
      fieldMap[k] = f.value;
    }

    setSaving(true);
    try {
      await updateNode(node.id, {
        name: trimmedName,
        branchType: isBranch ? (branchType === '__none__' ? null : branchType) : undefined,
        fields: fieldMap,
      });
      toast({ title: 'Сохранено' });
    } catch {
      toast({ title: 'Ошибка сохранения', description: 'Не удалось обновить узел', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [node, name, branchType, fields, isBranch, updateNode, toast]);

  const handleAddField = () => {
    setFields((prev) => [...prev, { key: '', value: '', isNew: true }]);
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: string, value: string) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    );
  };

  const handleExport = async () => {
    if (!node) return;
    try {
      const data = await api.exportBranch(node.id);
      openExportTable(data.branchName, data.columns, data.rows);
    } catch {
      toast({
        title: 'Ошибка экспорта',
        description: 'Не удалось экспортировать ветку',
        variant: 'destructive',
      });
    }
  };

  if (!node) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isBranch ? 'Редактирование ветки' : 'Редактирование элемента'}
          </SheetTitle>
          <SheetDescription>
            Измените параметры узла и нажмите «Сохранить»
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 mt-2">
          {/* Node name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="node-name">Название</Label>
            <Input
              id="node-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название..."
            />
          </div>

          {/* Branch type (only for branches) */}
          {isBranch && (
            <div className="flex flex-col gap-1.5">
              <Label>Тип ветки</Label>
              <Select value={branchType} onValueChange={setBranchType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите тип..." />
                </SelectTrigger>
                <SelectContent>
                  {BRANCH_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Dynamic fields */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>Поля</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleAddField}
              >
                <Plus className="h-3 w-3" />
                Добавить поле
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                Нет дополнительных полей. Нажмите «Добавить поле».
              </p>
            )}

            <div className="flex flex-col gap-2">
              {fields.map((field, idx) => (
                <div key={idx} className="flex flex-col gap-1 rounded-md border p-2 bg-muted/30">
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={field.key}
                      onChange={(e) => handleFieldChange(idx, 'key', e.target.value)}
                      placeholder="Имя поля"
                      className="h-7 text-sm flex-1 font-mono"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveField(idx)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Textarea
                    value={field.value}
                    onChange={(e) => handleFieldChange(idx, 'value', e.target.value)}
                    placeholder="Значение..."
                    className="text-sm min-h-[60px] resize-y"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="w-full"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>

            {isBranch && (
              <Button
                variant="outline"
                onClick={handleExport}
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                Экспорт в таблицу
              </Button>
            )}
          </div>

          {/* Node meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
            <Badge variant="outline" className="text-xs font-mono">
              ID: {node.id.slice(-6).toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {isBranch ? 'Ветка' : 'Элемент'}
            </Badge>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
