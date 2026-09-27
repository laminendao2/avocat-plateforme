'use client';
import { usePathname } from 'next/navigation';
import { Search, Bell, X, AlertTriangle, CreditCard, UserPlus, Calendar } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/dossiers': 'Dossiers',
  '/clients': 'Clients',
  '/agenda': 'Agenda',
  '/documents': 'Documents',
  '/factures': 'Facturation',
  '/parametres': 'Paramètres',
  '/admin/avocats': 'Gestion des avocats',
};

function getTitle(pathname: string) {
  for (const [key, label] of Object.entries(PAGE_TITLES)) {
    if (pathname === key || (pathname.startsWith(key + '/') || pathname === key)) return label;
  }
  return 'Cabinet Juridique';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

const TYPE_ICONS: Record<string, any> = {
  echeance: AlertTriangle,
  facture: CreditCard,
  nouveau: UserPlus,
  agenda: Calendar,
};

const TYPE_COLORS: Record<string, string> = {
  echeance: 'text-orange-500 bg-orange-50',
  facture: 'text-red-500 bg-red-50',
  nouveau: 'text-blue-500 bg-blue-50',
  agenda: 'text-purple-500 bg-purple-50',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return `il y a ${Math.floor(hrs / 24)}j`;
}

export default function TopBar({ user }: { user: { displayName?: string; email: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const title = getTitle(pathname);
  const firstName = (user.displayName ?? user.email ?? '').split(' ')[0];

  useEffect(() => {
    setLoadingNotifs(true);
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => { setNotifications(d.notifications || []); setLoadingNotifs(false); })
      .catch(() => setLoadingNotifs(false));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/documents?q=${encodeURIComponent(query.trim())}`);
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayStr = today.charAt(0).toUpperCase() + today.slice(1);
  const unreadCount = notifications.length;

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
      <div className="hidden lg:flex flex-col min-w-0 flex-shrink-0">
        <h1 className="font-semibold text-base leading-tight" style={{ color: '#0C1B3E' }}>{title}</h1>
        <p className="text-xs mt-0.5" style={{ color: '#6B7A99' }}>{todayStr}</p>
      </div>

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
          style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(12,27,62,0.12)', color: '#0C1B3E' }}
        />
      </form>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="hidden xl:block text-sm" style={{ color: '#6B7A99' }}>
          {getGreeting()}, <span style={{ color: '#0C1B3E', fontWeight: 500 }}>{firstName}</span>
        </span>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition hover:bg-black/5"
            style={{ color: '#6B7A99' }}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-sm text-[#0C1B3E]">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                  <button onClick={() => setShowNotifs(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loadingNotifs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF5A]" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <Bell className="h-8 w-8 opacity-30 mb-2" />
                    <p className="text-sm">Aucune notification</p>
                  </div>
                ) : (
                  notifications.map(n => {
                    const NIcon = TYPE_ICONS[n.type] || Bell;
                    const colorCls = TYPE_COLORS[n.type] || 'text-gray-500 bg-gray-50';
                    return (
                      <button
                        key={n.id}
                        onClick={() => { setShowNotifs(false); if (n.lien) router.push(n.lien); }}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorCls}`}>
                          <NIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0C1B3E] truncate">{n.titre}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{timeAgo(n.date)}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ring-2"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #4F46E5)', ringColor: 'rgba(255,255,255,0.3)' }}
        >
          {(user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
