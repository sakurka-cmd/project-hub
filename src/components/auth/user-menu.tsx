'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { Settings, LogOut, Shield, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu() {
  const currentUser = useAppStore((s) => s.currentUser);

  const username = currentUser?.username || 'Пользователь';
  const isAdmin = currentUser?.role === 'admin';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 gap-2 pl-2 pr-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
            {username}
          </span>
          {isAdmin && (
            <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] px-1.5 py-0 gap-0.5">
              <Shield className="h-2.5 w-2.5" />
              Админ
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{username}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {isAdmin ? (
                <>
                  <Shield className="h-3 w-3" />
                  Администратор
                </>
              ) : (
                'Пользователь'
              )}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer gap-2">
            <Settings className="h-4 w-4" />
            Настройки
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
