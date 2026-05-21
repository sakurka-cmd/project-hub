'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { AppShell } from '@/components/app-shell';

export default function Home() {
  const loadAllData = useAppStore(s => s.loadAllData);

  useEffect(() => {
    loadAllData();
  }, []);

  return <AppShell />;
}
