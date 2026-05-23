'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProjectNode, FileAttachment } from '@/types';
import { api } from '@/lib/api';
import { openExportTable } from '@/lib/export-table';
import { formatFileSize } from '@/lib/constants';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
  Upload,
  FileIcon,
  Trash2,
  Loader2,
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
  const loadAllData = useAppStore((s) => s.loadAllData);

  const [name, setName] = useState('');
  const [branchType, setBranchType] = useState<string>('__none__');
  const [fields, setFields] = useState<FieldEntry[]>([]);
  const [saving, setSaving] = useState(false);

  // File attachments
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Load attachments
      loadAttachments(node.id);
    } else {
      setAttachments([]);
    }
  }, [node]);

  const loadAttachments = async (nodeId: string) => {
    setLoadingFiles(true);
    try {
      const nodeData = await api.getNode(nodeId);
      setAttachments((nodeData as any).attachments || []);
    } catch {
      setAttachments([]);
    } finally {
      setLoadingFiles(false);
    }
  };

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

  const handleFileUpload = async (files: FileList) => {
    if (!node) return;
    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of Array.from(files)) {
      try {
        await api.uploadFile(node.id, file);
        successCount++;
      } catch (err: any) {
        failCount++;
        toast({
          title: 'Ошибка загрузки',
          description: `${file.name}: ${err?.message || 'Не удалось загрузить'}`,
          variant: 'destructive',
        });
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast({ title: `Загружено файлов: ${successCount}` });
      await loadAttachments(node.id);
      await loadAllData();
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await api.deleteFile(fileId);
      setAttachments((prev) => prev.filter((a) => a.id !== fileId));
      toast({ title: 'Файл удалён' });
      await loadAllData();
    } catch {
      toast({
        title: 'Ошибка удаления',
        description: 'Не удалось удалить файл',
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

          {/* File attachments section */}
          <div className="flex flex-col gap-3">
            <Label>Файлы</Label>

            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files);
              }}
              className={cn(
                'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                uploading && 'pointer-events-none opacity-60'
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleFileUpload(e.target.files);
                  e.target.value = '';
                }}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Загрузка...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Перетащите файлы сюда или нажмите для выбора
                  </p>
                </>
              )}
            </div>

            {/* File list */}
            {loadingFiles ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : attachments.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 p-2 border rounded-md bg-card"
                  >
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate flex-1 min-w-0" title={att.originalName}>
                      {att.originalName}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatFileSize(att.size)}
                    </span>
                    <a
                      href={api.getFileUrl(att.id)}
                      download
                      className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                      title="Скачать"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleDeleteFile(att.id)}
                      className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-1">
                Нет прикреплённых файлов
              </p>
            )}
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
