'use client';
import { usePathname } from 'next/navigation';
import { Search, Bell } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/dossiers': 'Dossiers',
  '/clients': 'Clients',
  '/agenda': 'Agenda',
  '/documents': 'Documents',
  '/parametres': 'Paramètres',
  '/admin/avocats': 'Gestion des avocats',
};

function getTitle(pathname: string) {
  for (const [key, label] of Object.entries(PAGE_TITLES)) {
    if (pathname === key || (pathname.startsWith(key) && key !== '/dashboard')) return label;
  }
  return 'Cabinet Juridique';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function TopBar({ user }: { user: { displayName?: string; email: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const title = getTitle(pathname);
  const firstName = (user.displayName ?? user.email ?? '').split(' ')[0];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/documents?q=${encodeURIComponent(query.trim())}`);
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  // Capitalize first letter
  const todayStr = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-4 px-6 py-3 border-b"
      style={{
        background: 'rgba(237,240,246,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'rgba(12,27,62,0.08)',
      }}
    >
      {/* Page title + date */}
      <div className="hidden lg:flex flex-col min-w-0 flex-shrink-0">
        <h1 className="font-semibold text-base leading-tight" style={{ color: '#0C1B3E' }}>{title}</h1>
        <p className="text-xs mt-0.5" style={{ color: '#6B7A99' }}>{todayStr}</p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <form onSubmit={handleSearch} className="relative flex-1 max-w-xs lg:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7A99' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un document, client…"
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none focus:ring-2 transition"
          style={{
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(12,27,62,0.12)',
            color: '#0C1B3E',
            focusRingColor: '#3B82F6',
          }}
        />
      </form>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Greeting (desktop) */}
        <span className="hidden xl:block text-sm" style={{ color: '#6B7A99' }}>
          {getGreeting()}, <span style={{ color: '#0C1B3E', fontWeight: 500 }}>{firstName}</span>
        </span>

        {/* Notification bell */}
        <button
          className="relative w-9 h-9 rounded-xl flex items-center justify-center transition hover:bg-black/5"
          style={{ color: '#6B7A99' }}
          title="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
        </button>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ring-2"
          style={{
            background: 'linear-gradient(135deg, #3B82F6, #4F46E5)',
            ringColor: 'rgba(255,255,255,0.3)',
          }}
        >
          {(user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
