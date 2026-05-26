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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  Plus,
  X,
  Upload,
  FileIcon,
  Trash2,
  Loader2,
  ClipboardList,
  Save,
  ImageIcon,
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

interface DecisionRow {
  task: string;
  deadline: string;
  responsible: string;
  comment: string;
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

  // Protocol-specific state
  const [protocolText, setProtocolText] = useState('');
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]); // attachment IDs
  const [pastingScreenshot, setPastingScreenshot] = useState(false);

  // File attachments
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBranch = node?.nodeType === 'branch';
  const isProtocol = node?.nodeType === 'protocol';
  const isTask = node?.nodeType === 'task';

  // Snapshot of original values to track unsaved changes
  const initialSnapshot = useRef<string | null>(null);

  // Sync local state when node changes & take snapshot for dirty detection
  useEffect(() => {
    if (node) {
      setName(node.name);
      setBranchType(node.branchType || '__none__');

      if (node.nodeType === 'protocol') {
        const f = node.fields;
        setProtocolText(typeof f.protocolText === 'string' ? f.protocolText : '');
        if (Array.isArray(f.decisions)) {
          setDecisions(f.decisions.map((d: any) => ({
            task: String(d.task || ''),
            deadline: String(d.deadline || ''),
            responsible: String(d.responsible || ''),
            comment: String(d.comment || ''),
          })));
        } else {
          setDecisions([]);
        }
        setScreenshots(Array.isArray(f.screenshots) ? f.screenshots.filter((s: unknown) => typeof s === 'string') : []);
        setFields([]);
      } else {
        setProtocolText('');
        setDecisions([]);
        setFields(
          Object.entries(node.fields).map(([key, value]) => ({
            key,
            value: String(value ?? ''),
          }))
        );
      }
      // Store snapshot for dirty detection
      initialSnapshot.current = JSON.stringify({
        name: node.name,
        branchType: node.branchType || '__none__',
        fields: node.fields,
      });
      // Load attachments
      loadAttachments(node.id);
    } else {
      setAttachments([]);
      initialSnapshot.current = null;
    }
  }, [node]);

  // Detect unsaved changes
  const hasChanges = (() => {
    if (!initialSnapshot.current || !node) return false;
    const current: Record<string, unknown> = { name, branchType };
    if (isProtocol) {
      current.protocolText = protocolText;
      current.decisions = decisions;
      current.screenshots = screenshots;
    } else {
      const fieldMap: Record<string, unknown> = {};
      for (const f of fields) {
        if (f.key.trim()) fieldMap[f.key.trim()] = f.value;
      }
      current.fields = fieldMap;
    }
    return JSON.stringify(current) !== initialSnapshot.current;
  })();

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

  const handleSave = useCallback(async () => {
    if (!node) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: 'Ошибка', description: 'Название не может быть пустым', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (isProtocol) {
        // Save protocol-specific data
        await updateNode(node.id, {
          name: trimmedName,
          fields: {
            protocolText,
            decisions,
            screenshots,
          },
        });
      } else if (isTask) {
        // Save task data (name + taskTypeId if any, keep completed)
        await updateNode(node.id, {
          name: trimmedName,
        });
      } else {
        // Save branch/item data
        // Validate field keys (no duplicates, no empty)
        const fieldMap: Record<string, unknown> = {};
        for (const f of fields) {
          const k = f.key.trim();
          if (!k) {
            toast({ title: 'Ошибка', description: 'Имя поля не может быть пустым', variant: 'destructive' });
            setSaving(false);
            return;
          }
          if (fieldMap.hasOwnProperty(k)) {
            toast({ title: 'Ошибка', description: `Дублирующее имя поля: "${k}"`, variant: 'destructive' });
            setSaving(false);
            return;
          }
          fieldMap[k] = f.value;
        }

        await updateNode(node.id, {
          name: trimmedName,
          branchType: isBranch ? (branchType === '__none__' ? null : branchType) : undefined,
          fields: fieldMap,
        });
      }
      toast({ title: 'Сохранено' });
      // Update snapshot so hasChanges becomes false after save
      const snap: Record<string, unknown> = { name: trimmedName, branchType: isBranch ? (branchType === '__none__' ? '__none__' : branchType) : '__none__' };
      if (isProtocol) {
        snap.protocolText = protocolText;
        snap.decisions = decisions;
        snap.screenshots = screenshots;
      } else if (!isTask) {
        const fieldMap: Record<string, unknown> = {};
        for (const f of fields) {
          if (f.key.trim()) fieldMap[f.key.trim()] = f.value;
        }
        snap.fields = fieldMap;
      }
      initialSnapshot.current = JSON.stringify(snap);
    } catch {
      toast({ title: 'Ошибка сохранения', description: 'Не удалось обновить узел', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [node, name, branchType, fields, isBranch, isProtocol, isTask, protocolText, decisions, screenshots, updateNode, toast]);

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

  // Decision row handlers
  const handleAddDecision = () => {
    setDecisions((prev) => [...prev, { task: '', deadline: '', responsible: '', comment: '' }]);
  };

  const handleRemoveDecision = (index: number) => {
    setDecisions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDecisionChange = (index: number, field: keyof DecisionRow, value: string) => {
    setDecisions((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
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

  // --- Screenshot paste handler ---
  const handlePasteScreenshot = useCallback(async (e: React.ClipboardEvent) => {
    if (!node || !isProtocol) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();

    const file = imageItem.getAsFile();
    if (!file) return;

    // Build a named file for upload
    const ext = file.type.split('/')[1] || 'png';
    const now = new Date();
    const stamp = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0'), String(now.getHours()).padStart(2,'0'), String(now.getMinutes()).padStart(2,'0'), String(now.getSeconds()).padStart(2,'0')].join('-');
    const namedFile = new File([file], `screenshot-${stamp}.${ext}`, { type: file.type });

    setPastingScreenshot(true);
    try {
      const att = await api.uploadFile(node.id, namedFile);
      const newScreenshots = [...screenshots, att.id];
      setScreenshots(newScreenshots);

      // Auto-save screenshot reference to node fields immediately
      const currentFields = node.fields || {};
      await updateNode(node.id, {
        fields: {
          ...currentFields,
          protocolText: typeof currentFields.protocolText === 'string' ? currentFields.protocolText : protocolText,
          decisions: Array.isArray(currentFields.decisions) ? currentFields.decisions : decisions,
          screenshots: newScreenshots,
        },
      });
      // Update snapshot so hasChanges stays clean
      initialSnapshot.current = JSON.stringify({
        name: node.name,
        branchType: node.branchType || '__none__',
        fields: {
          ...currentFields,
          screenshots: newScreenshots,
        },
      });

      toast({ title: 'Скриншот добавлен' });
    } catch (err: any) {
      toast({ title: 'Ошибка вставки', description: err?.message || 'Не удалось загрузить скриншот', variant: 'destructive' });
    } finally {
      setPastingScreenshot(false);
    }
  }, [node, isProtocol, screenshots, protocolText, decisions, updateNode, toast]);

  const handleRemoveScreenshot = async (attId: string) => {
    const newScreenshots = screenshots.filter(id => id !== attId);
    setScreenshots(newScreenshots);
    // Auto-save removal
    if (node) {
      try {
        const currentFields = node.fields || {};
        await updateNode(node.id, {
          fields: {
            ...currentFields,
            protocolText: typeof currentFields.protocolText === 'string' ? currentFields.protocolText : protocolText,
            decisions: Array.isArray(currentFields.decisions) ? currentFields.decisions : decisions,
            screenshots: newScreenshots,
          },
        });
        initialSnapshot.current = JSON.stringify({
          name: node.name,
          branchType: node.branchType || '__none__',
          fields: { ...currentFields, screenshots: newScreenshots },
        });
      } catch { /* best-effort */ }
    }
    try { await api.deleteFile(attId); } catch { /* best-effort cleanup */ }
  };

  // --- Protocol export (uses current local state, not DB) ---
  const handleExportProtocol = async () => {
    if (!node || node.nodeType !== 'protocol') return;

    // Use current local state (what user sees right now), not node.fields
    const text = protocolText;
    const decs = decisions;
    const shotIds = screenshots;

    const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Fetch screenshots as base64 data-URIs
    const imgTags: string[] = [];
    for (const id of shotIds) {
      try {
        const res = await fetch(api.getFileUrl(id), { credentials: 'include' });
        const blob = await res.blob();
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        imgTags.push(`<img src="${dataUri}" style="max-width:100%; border:1px solid #e2e8f0; border-radius:4px; margin:6px 0; display:block;" />`);
      } catch { /* skip failed */ }
    }

    const decisionsRows = decs.map((d, i) => `
          <tr>
            <td style="text-align:center; color:#64748b; font-weight:500; width:30px;">${i + 1}</td>
            <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0; color:#1e293b; vertical-align:top;">${esc(d.task)}</td>
            <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0; color:#1e293b; vertical-align:top; white-space:nowrap;">${esc(d.deadline)}</td>
            <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0; color:#1e293b; vertical-align:top; white-space:nowrap;">${esc(d.responsible)}</td>
            <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0; color:#475569; vertical-align:top;">${esc(d.comment)}</td>
          </tr>`).join('');

    const contentHtml = `
  <h1 style="font-size:18px; font-weight:700; color:#1e293b; margin:0 0 4px 0;">${esc(name)}</h1>

  ${text ? `
  <p style="font-size:14px; line-height:1.6; color:#334155; margin:0 0 16px 0; white-space:pre-wrap;">${esc(text)}</p>` : ''}

  ${imgTags.length > 0 ? `\n  ${imgTags.join('\n  ')}\n` : ''}

  ${decs.length > 0 ? `
  <table style="width:100%; border-collapse:collapse; font-size:13px; border:1px solid #cbd5e1; margin-top:16px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="text-align:center; width:30px; padding:8px 6px; border-bottom:2px solid #cbd5e1; border-right:1px solid #e2e8f0; color:#475569; font-weight:600; font-size:12px;">#</th>
        <th style="text-align:left; padding:8px 12px; border-bottom:2px solid #cbd5e1; border-right:1px solid #e2e8f0; color:#475569; font-weight:600; font-size:12px;">Задача / Решение</th>
        <th style="text-align:left; padding:8px 12px; border-bottom:2px solid #cbd5e1; border-right:1px solid #e2e8f0; color:#475569; font-weight:600; font-size:12px;">Срок</th>
        <th style="text-align:left; padding:8px 12px; border-bottom:2px solid #cbd5e1; border-right:1px solid #e2e8f0; color:#475569; font-weight:600; font-size:12px;">Ответственный</th>
        <th style="text-align:left; padding:8px 12px; border-bottom:2px solid #cbd5e1; color:#475569; font-weight:600; font-size:12px;">Комментарий</th>
      </tr>
    </thead>
    <tbody>
      ${decisionsRows}
    </tbody>
  </table>` : ''}`;

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${esc(name)}</title>
</head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:14px; color:#1e293b; line-height:1.5; padding:20px; background:#fff;">

  <div style="margin-bottom:16px; display:flex; gap:8px;">
    <button onclick="copyProtocol()" id="copyBtn" style="padding:6px 16px; font-size:13px; font-family:inherit; cursor:pointer; border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc; color:#334155;">Копировать в буфер обмена</button>
  </div>
  <div id="content">${contentHtml}</div>

  <script>
  function copyProtocol() {
    var content = document.getElementById('content');
    var html = content.innerHTML;
    var btn = document.getElementById('copyBtn');
    if (navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], {type:'text/html'}) })
      ]).then(function() {
        btn.textContent = 'Скопировано!';
        setTimeout(function(){ btn.textContent = 'Копировать в буфер обмена'; }, 2000);
      }).catch(function() {
        fallbackCopy(content);
      });
    } else {
      fallbackCopy(content);
    }
  }
  function fallbackCopy(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('copy');
    sel.removeAllRanges();
    var btn = document.getElementById('copyBtn');
    btn.textContent = 'Скопировано!';
    setTimeout(function(){ btn.textContent = 'Копировать в буфер обмена'; }, 2000);
  }
  <\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=960,height=700,scrollbars=yes');
    if (win) {
      win.document.write(html);
      win.document.close();
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

  const nodeTypeLabel = isBranch ? 'ветки' : isProtocol ? 'протокола' : isTask ? 'задачи' : 'элемента';

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isProtocol ? (
              <span className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                Редактирование протокола
              </span>
            ) : isBranch ? 'Редактирование ветки' : isTask ? 'Редактирование задачи' : 'Редактирование элемента'}
          </SheetTitle>
          <SheetDescription>
            Измените параметры и нажмите «Сохранить»
          </SheetDescription>
        </SheetHeader>

        {/* Floating action buttons — save appears on changes, export always visible */}
        <div className="sticky top-0 z-10 flex items-center justify-end gap-2 -mt-2 mb-1">
          {isBranch && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              className="h-8 px-3 text-xs gap-1.5 rounded-full shadow-md border-muted-foreground/20 bg-background/95 backdrop-blur-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Экспорт
            </Button>
          )}

          {isProtocol && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportProtocol}
              className="h-8 px-3 text-xs gap-1.5 rounded-full shadow-md border-muted-foreground/20 bg-background/95 backdrop-blur-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Экспорт
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={cn(
              'h-8 px-3 text-xs gap-1.5 rounded-full shadow-md transition-all duration-300',
              hasChanges
                ? 'bg-primary text-primary-foreground opacity-100 scale-100'
                : 'opacity-0 scale-90 pointer-events-none'
            )}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Сохранить
          </Button>
        </div>

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

          {/* ========== PROTOCOL-SPECIFIC SECTION ========== */}
          {isProtocol && (
            <div onPaste={handlePasteScreenshot}>
              {/* Protocol text */}
              <div className="flex flex-col gap-1.5">
                <Label>Текст протокола</Label>
                <Textarea
                  value={protocolText}
                  onChange={(e) => setProtocolText(e.target.value)}
                  placeholder="Введите текст протокола..."
                  className="text-sm min-h-[120px] resize-y"
                  rows={6}
                />
              </div>

              {/* Screenshots section */}
              <div className="flex flex-col gap-2 mt-5">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Скриншоты</Label>
                  <span className="text-xs text-muted-foreground">Ctrl+V для вставки</span>
                </div>

                {pastingScreenshot && (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Вставка скриншота...</span>
                  </div>
                )}

                {screenshots.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {screenshots.map((attId) => (
                      <div key={attId} className="relative group rounded-lg border overflow-hidden bg-muted/20">
                        <img
                          src={api.getFileUrl(attId)}
                          alt="Скриншот"
                          className="w-full h-auto max-h-48 object-contain bg-white"
                        />
                        <button
                          onClick={() => handleRemoveScreenshot(attId)}
                          className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                          title="Удалить скриншот"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {screenshots.length === 0 && !pastingScreenshot && (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground/50 mb-1" />
                    <p className="text-sm text-muted-foreground">
                      Вставьте скриншот из буфера обмена (Ctrl+V)
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Decisions table */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Решения</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleAddDecision}
                  >
                    <Plus className="h-3 w-3" />
                    Добавить решение
                  </Button>
                </div>

                {decisions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Нет решений. Нажмите «Добавить решение».
                  </p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-center">#</TableHead>
                          <TableHead className="min-w-[180px]">Задача / Решение</TableHead>
                          <TableHead className="min-w-[100px]">Срок</TableHead>
                          <TableHead className="min-w-[120px]">Ответственный</TableHead>
                          <TableHead className="min-w-[140px]">Комментарий</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {decisions.map((decision, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-center text-muted-foreground text-sm font-mono">
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              <Input
                                value={decision.task}
                                onChange={(e) => handleDecisionChange(idx, 'task', e.target.value)}
                                placeholder="Описание..."
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={decision.deadline}
                                onChange={(e) => handleDecisionChange(idx, 'deadline', e.target.value)}
                                placeholder="ДД.ММ.ГГГГ"
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={decision.responsible}
                                onChange={(e) => handleDecisionChange(idx, 'responsible', e.target.value)}
                                placeholder="ФИО"
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={decision.comment}
                                onChange={(e) => handleDecisionChange(idx, 'comment', e.target.value)}
                                placeholder="Комментарий"
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveDecision(idx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />
            </div>
          )}

          {/* ========== GENERIC FIELDS SECTION (for items only) ========== */}
          {!isProtocol && !isTask && (
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
          )}

          {/* Task has no extra fields, just a separator */}
          {!isProtocol && isTask && null}

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

            {isProtocol && (
              <Button
                variant="outline"
                onClick={handleExportProtocol}
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                Экспорт протокола
              </Button>
            )}
          </div>

          {/* Node meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
            <Badge variant="outline" className="text-xs font-mono">
              ID: {node.id.slice(-6).toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {isProtocol ? 'Протокол' : isTask ? 'Задача' : isBranch ? 'Ветка' : 'Элемент'}
            </Badge>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
