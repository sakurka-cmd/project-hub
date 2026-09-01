'use client';

import { splitHighlight } from '@/lib/search';

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

/** Текст с подсветкой совпадений под поисковый запрос */
export function HighlightText({ text, query, className }: HighlightTextProps) {
  const parts = splitHighlight(text, query);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.match ? (
          <mark
            key={i}
            className="rounded-[2px] px-0.5 bg-amber-200/80 text-foreground dark:bg-amber-500/40"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}
