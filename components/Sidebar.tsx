'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Scale, LayoutDashboard, FolderOpen, Users, Calendar,
  FileText, Settings, LogOut, Menu, X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dossiers', label: 'Dossiers', icon: FolderOpen },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
];

export default function Sidebar({ user }: { user: { nom: string; email: string; role: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-blue-800">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Scale className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Cabinet Juridique</p>
          <p className="text-blue-300 text-xs">Gestion des dossiers</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href.split('?')[0] && (href === pathname || href.includes('?') ? false : true);
          const isActive = pathname === href || (pathname.startsWith(href) && href !== '/dashboard');
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                ''
              } ${
                isActive
                  ? 'bg-blue-600 text-white font-medium shadow-lg'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <Icon className="flex-shrink-0 w-4 h-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-blue-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{(user.displayName ?? user.email ?? "").split(" ")[0]}</p>
            <p className="text-blue-300 text-xs truncate">{user.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg text-sm transition"
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
        className="lg:hidden fixed top-4 left-4 z-50 bg-blue-900 text-white p-2 rounded-lg shadow-lg"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay mobile */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-blue-900 h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-blue-900 transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>
    </>
  );
}
