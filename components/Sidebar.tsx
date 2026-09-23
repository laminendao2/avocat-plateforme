'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, Users, Calendar,
  FileText, Settings, LogOut, Menu, X, ShieldCheck
} from 'lucide-react';
import LogoCJ from '@/components/LogoCJ';
import { useState } from 'react';

const ADMIN_EMAILS = ['laminendao2@gmail.com', 'laminendao2@hotmail.com'];

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dossiers', label: 'Dossiers', icon: FolderOpen },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
];

export default function Sidebar({ user }: { user: { nom?: string; displayName?: string; email: string; role: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAdmin = ADMIN_EMAILS.includes(user.email);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/40 ring-1 ring-white/10">
          <LogoCJ variant="dark" size={36} />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight tracking-tight">Cabinet Juridique</p>
          <p className="text-blue-300/80 text-xs">Gestion des dossiers</p>
        </div>
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-blue-700/60 to-transparent" />

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (pathname.startsWith(href) && href !== '/dashboard');
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium shadow-lg shadow-blue-900/30'
                  : 'text-blue-100/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white/80" />}
              <Icon className="flex-shrink-0 w-4 h-4" />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Lien admin uniquement */}
        {isAdmin && (
          <>
            <div className="px-3 pt-5 pb-1">
              <p className="text-blue-400/70 text-[11px] font-semibold uppercase tracking-widest">Administration</p>
            </div>
            <Link
              href="/admin/avocats"
              onClick={() => setOpen(false)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                pathname.startsWith('/admin')
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium shadow-lg shadow-blue-900/30'
                  : 'text-blue-100/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ShieldCheck className="flex-shrink-0 w-4 h-4" />
              <span>Gestion des avocats</span>
            </Link>
          </>
        )}
      </nav>

      {/* User */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-blue-700/60 to-transparent" />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ring-2 ring-white/10">
            {(user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{(user.displayName ?? user.email ?? '').split(' ')[0]}</p>
            <p className="text-blue-300/70 text-xs truncate">{isAdmin ? 'Admin' : user.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-blue-200/80 hover:text-white hover:bg-white/5 rounded-lg text-sm transition"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-blue-900/95 backdrop-blur text-white p-2.5 rounded-xl shadow-lg shadow-black/20 ring-1 ring-white/10 active:scale-95 transition"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay mobile */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 h-screen sticky top-0 flex-shrink-0 shadow-2xl">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 shadow-2xl transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>
    </>
  );
}
