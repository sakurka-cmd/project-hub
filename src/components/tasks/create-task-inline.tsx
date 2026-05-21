'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { Task } from '@/types';
import {
  CHILD_TYPE_FOR_PARENT,
  getShortId,
} from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

interface CreateTaskInlineProps {
  projectId: string;
  parentId?: string | null;
  workItemType?: Task['workItemType'];
  placeholder?: string;
  onCancel?: () => void;
}

export function CreateTaskInline({
  projectId,
  parentId = null,
  workItemType = 'task',
  placeholder = 'Введите название...',
  onCancel,
}: CreateTaskInlineProps) {
  const [title, setTitle] = useState('');
  const [visible, setVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useAppStore(s => s.createTask);
  const { toast } = useToast();

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    try {
      await createTask({
        title: title.trim(),
        projectId,
        parentId: parentId || null,
        workItemType,
        status: 'todo',
        priority: 'medium',
      });
      toast({ title: 'Элемент создан' });
      setTitle('');
      if (onCancel) onCancel();
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось создать элемент', variant: 'destructive' });
    }
  }, [title, projectId, parentId, workItemType, createTask, toast, onCancel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setTitle('');
      setVisible(false);
      if (onCancel) onCancel();
    }
  };

  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 py-1">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) {
            setVisible(false);
            if (onCancel) onCancel();
          }
        }}
        placeholder={placeholder}
        className="flex-1 rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-1.5 text-sm outline-none focus:border-primary focus:bg-background transition-colors"
      />
      {onCancel && (
        <button
          onClick={() => {
            setTitle('');
            setVisible(false);
            onCancel();
          }}
          className="text-xs text-muted-foreground hover:text-foreground shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  );
}
