'use client';

import { AppShell } from '@/components/app-shell';
import { BondYieldCalculator } from '@/components/bond-yield-calculator';

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <BondYieldCalculator />
    </div>
  );
}
