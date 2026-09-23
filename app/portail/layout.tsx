'use client';
import { useRouter, usePathname } from 'next/navigation';
import { FolderOpen, Calendar, LogOut, UserCircle } from 'lucide-react';
import LogoCJ from '@/components/LogoCJ';

export default function PortailLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname === '/portail/login') return <>{children}</>;

  async function logout() {
    await fetch('/api/portail/auth', { method: 'DELETE' });
    router.push('/portail/login');
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #EDF0F6 0%, #F0F3F9 40%, #E8EEF7 100%)' }}>
      {/* Header */}
      <header className="shadow-sm sticky top-0 z-10" style={{ background: '#0C1B3E', borderBottom: '1px solid rgba(184,150,62,0.2)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          {/* Logo + titre */}
          <div className="flex items-center gap-3 min-w-0">
            <LogoCJ variant="dark" size={36} />
            <div>
              <span className="font-semibold text-white text-sm" style={{ fontFamily: 'Georgia, serif' }}>Cabinet Juridique</span>
              <p className="text-blue-300 hidden sm:block" style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Espace Client</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => router.push('/portail')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition"
              style={{
                background: pathname === '/portail' ? 'rgba(184,150,62,0.15)' : 'transparent',
                color: pathname === '/portail' ? '#D4AF5A' : 'rgba(255,255,255,0.7)',
              }}
            >
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Dossiers</span>
            </button>
            <button
              onClick={() => router.push('/portail/agenda')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition"
              style={{
                background: pathname === '/portail/agenda' ? 'rgba(184,150,62,0.15)' : 'transparent',
                color: pathname === '/portail/agenda' ? '#D4AF5A' : 'rgba(255,255,255,0.7)',
              }}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Agenda</span>
            </button>
            <button
              onClick={() => router.push('/portail/profil')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition"
              style={{
                background: pathname === '/portail/profil' ? 'rgba(184,150,62,0.15)' : 'transparent',
                color: pathname === '/portail/profil' ? '#D4AF5A' : 'rgba(255,255,255,0.7)',
              }}
            >
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Profil</span>
            </button>
                        <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ml-2"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
