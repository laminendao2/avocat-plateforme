'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, Users, Calendar, FileText,
  Settings, Trash2, UserCog, LogOut, Menu, Briefcase
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
  const [cabinetNom, setCabinetNom] = useState('Cabinet Juridique');
  const [cabinetLogoUrl, setCabinetLogoUrl] = useState<string | null>(null);
  const isAdmin = ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    fetch('/api/parametres/cabinet')
      .then(r => r.json())
      .then(d => {
        if (d.cabinetNom) setCabinetNom(d.cabinetNom);
        if (d.cabinetLogoUrl) setCabinetLogoUrl(d.cabinetLogoUrl);
      })
      .catch(() => {});
  }, []);

  const initial = (user.displayName ?? user.email ?? '?').charAt(0).toUpperCase();
  const name = user.displayName || user.email.split('@')[0];

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const active = isActive(href);
    return (
      <Link key={href} href={href} onClick={() => setOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
          active
            ? 'text-white'
            : 'hover:text-white/85'
        }`}
        style={active
          ? { background: 'rgba(255,255,255,0.13)', color: '#fff' }
          : { color: 'rgba(255,255,255,0.55)' }
        }>
        <Icon style={{ width: '18px', height: '18px', flexShrink: 0 }} />
        {label}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#0C1B3E' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {cabinetLogoUrl ? (
          <img src={cabinetLogoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#D4AF5A' }}>
            <Briefcase className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">{cabinetNom}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Gestion des dossiers</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => <NavLink key={item.href} {...item} />)}

        {isAdmin && (
          <>
            <div className="mt-4 mb-2 px-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.28)' }}>
                Administration
              </p>
            </div>
            {adminItems.map(item => <NavLink key={item.href} {...item} />)}
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
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>Admin</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#fff'; el.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'rgba(255,255,255,0.45)'; el.style.background = 'transparent'; }}>
            <LogOut style={{ width: '16px', height: '16px' }} /> Déconnexion
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 min-h-screen">
        <SidebarContent />
      </aside>

      <button onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg"
        style={{ background: '#0C1B3E' }}>
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-56 flex flex-col flex-shrink-0"><SidebarContent /></div>
          <div className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
