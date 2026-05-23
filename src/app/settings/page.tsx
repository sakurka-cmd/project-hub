'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [maxFileSizeMb, setMaxFileSizeMb] = useState('10');
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && !isAdmin) return;

    if (status === 'authenticated' && isAdmin) {
      loadSettings();
    }
  }, [status, isAdmin]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await api.getSettings();
      if (settings.max_file_size_mb) {
        setMaxFileSizeMb(settings.max_file_size_mb);
      }
      if (settings.allow_registration !== undefined) {
        setAllowRegistration(settings.allow_registration === 'true');
      }
    } catch {
      // Settings might not exist yet — use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings({
        max_file_size_mb: maxFileSizeMb,
        allow_registration: String(allowRegistration),
      });
      toast({ title: 'Настройки сохранены' });
    } catch (err: any) {
      toast({
        title: 'Ошибка сохранения',
        description: err?.message || 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Auth loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Доступ запрещён</h1>
          <p className="text-muted-foreground">
            Эта страница доступна только администраторам.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4 md:px-6 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Назад</span>
          </Button>
          <h1 className="font-semibold text-lg">Настройки системы</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Параметры системы</CardTitle>
                <CardDescription>
                  Управление глобальными настройками ProjectHub
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Max file size */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="max-file-size">Ограничение размера файлов</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="max-file-size"
                      type="number"
                      min={1}
                      max={100}
                      value={maxFileSizeMb}
                      onChange={(e) => setMaxFileSizeMb(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">МБ</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Максимальный размер загружаемого файла
                  </p>
                </div>

                <Separator />

                {/* Allow registration */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor="allow-registration">Регистрация новых пользователей</Label>
                    <p className="text-xs text-muted-foreground">
                      Разрешить создание новых аккаунтов
                    </p>
                  </div>
                  <Switch
                    id="allow-registration"
                    checked={allowRegistration}
                    onCheckedChange={setAllowRegistration}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[120px]">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Сохранить'
                )}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
