'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { AppShell } from '@/components/app-shell';

export default function Home() {
  const loadDashboard = useAppStore(s => s.loadDashboard);
  const loadProjects = useAppStore(s => s.loadProjects);

  useEffect(() => {
    loadDashboard();
    loadProjects();
  }, []);

  return <AppShell />;
}
