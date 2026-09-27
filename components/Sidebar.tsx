'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, Users, Calendar, FileText,
  Settings, Trash2, UserCog, LogOut, Menu, X, Briefcase
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dossiers', label: 'Dossiers', icon: FolderOpen },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
  { href: '/corbeille', label: 'Corbeille', icon: Trash2 },
];

const adminItems = [
  { href: '/admin/avocats', label: 'Gestion des avocats', icon: UserCog },
];

const ADMIN_EMAILS = ['laminendao2@gmail.com', 'laminendao2@hotmail.com'];

export default function Sidebar({ user }: { user: { displayName?: string; email: string; role?: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = ADMIN_EMAILS.includes(user.email);

  const initial = (user.displayName ?? user.email ?? '?').charAt(0).toUpperCase();
  const name = user.displayName || user.email.split('@')[0];

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#0C1B3E' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#D4AF5A' }}>
          <Briefcase className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Cabinet Juridique</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Gestion des dossiers</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={active
                ? { background: 'rgba(255,255,255,0.12)', color: '#fff' }
                : { color: 'rgba(255,255,255,0.55)' }
              }
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}>
              <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: '18px', height: '18px' }} />
              {label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="mt-4 mb-2 px-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Administration
              </p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                  style={active
                    ? { background: 'rgba(255,255,255,0.12)', color: '#fff' }
                    : { color: 'rgba(255,255,255,0.55)' }}>
                  <Icon style={{ width: '18px', height: '18px' }} />
                  {label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: '#D4AF5A' }}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{name}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>Admin</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <LogOut style={{ width: '16px', height: '16px' }} /> Déconnexion
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 min-h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg"
        style={{ background: '#0C1B3E' }}>
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-56 flex flex-col flex-shrink-0"><SidebarContent /></div>
          <div className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
