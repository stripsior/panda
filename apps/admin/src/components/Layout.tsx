import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Map, Flag, Users, UserCog, LogOut, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { getStoredSession, logout } from '../api';
import { Button } from './ui/button';

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  organizer: 'Organizator',
  player: 'Gracz',
};

const nav = [
  { to: '/', label: 'Przegląd', icon: Map },
  { to: '/teams', label: 'Drużyny', icon: Users },
  { to: '/checkpoints', label: 'Punkty kontrolne', icon: Flag },
  { to: '/users', label: 'Użytkownicy', icon: UserCog },
];

export function Layout() {
  const session = getStoredSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
        <div className="flex items-center gap-2">
          <img src="/panda-logo.png" alt="PandaGo" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-medium tracking-tight">PandaGo Admin</span>
        </div>
        <Button
          variant="ghost"
          className="h-9 w-9 p-0"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Zamknij menu' : 'Otwórz menu'}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* backdrop for the mobile drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col border-r border-border bg-card transition-transform md:static md:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4 max-md:mt-14">
          <img src="/panda-logo.png" alt="PandaGo" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-medium tracking-tight">PandaGo Admin</span>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-muted',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-border p-4">
          <p className="text-sm font-medium">{session?.displayName ?? 'Nieznany'}</p>
          <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
            {session ? (roleLabels[session.role] ?? session.role) : '—'}
          </p>
          <Button variant="outline" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Wyloguj się
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto max-md:pt-14">
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
