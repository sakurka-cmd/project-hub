'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { ElementTypesManager } from '@/components/settings/element-types-manager';
import { TaskTypesManager } from '@/components/settings/task-types-manager';

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const currentUser = useAppStore((s) => s.currentUser);
  const elementTypes = useAppStore((s) => s.elementTypes);
  const taskTypes = useAppStore((s) => s.taskTypes);
  const loadAllData = useAppStore((s) => s.loadAllData);

  const isAdmin = currentUser?.role === 'admin';

  // System settings (admin only)
  const [maxFileSizeMb, setMaxFileSizeMb] = useState('10');
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [systemSaving, setSystemSaving] = useState(false);
  const [systemLoading, setSystemLoading] = useState(true);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      api.getMe()
        .then((user) => {
          useAppStore.getState().setCurrentUser({
            id: user.id,
            username: user.username,
            role: user.role,
          });
        })
        .catch(() => {
          router.push('/login');
        });
      return;
    }

    if (isAdmin) {
      loadSettings();
      loadAllData();
    }
  }, [currentUser, isAdmin, router, loadAllData]);

  const loadSettings = async () => {
    setSystemLoading(true);
    try {
      const settings = await api.getSettings();
      if (settings.max_file_size_mb) setMaxFileSizeMb(settings.max_file_size_mb);
      if (settings.allow_registration !== undefined) {
        setAllowRegistration(settings.allow_registration === 'true');
      }
    } catch {
      // use defaults
    } finally {
      setSystemLoading(false);
    }
  };

  const handleSaveSystem = async () => {
    setSystemSaving(true);
    try {
      await api.updateSettings({
        max_file_size_mb: maxFileSizeMb,
        allow_registration: String(allowRegistration),
      });
      toast({ title: 'Настройки сохранены' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setSystemSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Ошибка', description: 'Новый пароль и подтверждение не совпадают', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 4) {
      toast({ title: 'Ошибка', description: 'Пароль должен быть не менее 4 символов', variant: 'destructive' });
      return;
    }

    setPasswordSaving(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      toast({ title: 'Пароль изменён' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось сменить пароль', variant: 'destructive' });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4 md:px-6 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Назад</span>
          </Button>
          <h1 className="font-semibold text-lg">
            {isAdmin ? 'Настройки системы' : 'Настройки'}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        {/* Password change — available to all users */}
        <Card>
          <CardHeader>
            <CardTitle>Смена пароля</CardTitle>
            <CardDescription>
              Аккаунт: <span className="font-medium">{currentUser.username}</span>
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-muted">
                {currentUser.role === 'admin' ? 'Администратор' : 'Пользователь'}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="current-password">Текущий пароль</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Введите текущий пароль"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">Новый пароль</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Минимум 4 символа"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password">Подтверждение нового пароля</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите новый пароль"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                className="gap-2 min-w-[120px]"
              >
                {passwordSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Сохранение...</>
                ) : 'Сменить пароль'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Admin-only settings */}
        {isAdmin && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Параметры системы</CardTitle>
                <CardDescription>Управление глобальными настройками ProjectHub</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {systemLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="max-file-size">Ограничение размера файлов</Label>
                      <div className="flex items-center gap-3">
                        <Input id="max-file-size" type="number" min={1} max={100} value={maxFileSizeMb} onChange={(e) => setMaxFileSizeMb(e.target.value)} className="w-24" />
                        <span className="text-sm text-muted-foreground">МБ</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Максимальный размер загружаемого файла</p>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <Label htmlFor="allow-registration">Регистрация новых пользователей</Label>
                        <p className="text-xs text-muted-foreground">Разрешить создание новых аккаунтов</p>
                      </div>
                      <Switch id="allow-registration" checked={allowRegistration} onCheckedChange={setAllowRegistration} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveSystem} disabled={systemSaving || systemLoading} className="gap-2 min-w-[120px]">
                {systemSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Сохранение...</>
                ) : 'Сохранить настройки'}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Типы элементов</CardTitle>
                <CardDescription>Шаблоны для быстрого создания элементов с предустановленными полями</CardDescription>
              </CardHeader>
              <CardContent>
                <ElementTypesManager elementTypes={elementTypes} onTypesChanged={loadAllData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Типы задач</CardTitle>
                <CardDescription>Цветовые метки для категоризации задач</CardDescription>
              </CardHeader>
              <CardContent>
                <TaskTypesManager taskTypes={taskTypes} onTypesChanged={loadAllData} />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

