'use client';
import { useRouter, usePathname } from 'next/navigation';
import { Scale, FolderOpen, Calendar, LogOut } from 'lucide-react';

export default function PortailLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname === '/portail/login') return <>{children}</>;

  async function logout() {
    await fetch('/api/portail/auth', { method: 'DELETE' });
    router.push('/portail/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800">Espace Client</span>
          </div>
          <nav className="flex items-center gap-1">
            <button onClick={() => router.push('/portail')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${pathname === '/portail' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <FolderOpen className="w-4 h-4" /> Dossiers
            </button>
            <button onClick={() => router.push('/portail/agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${pathname === '/portail/agenda' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Calendar className="w-4 h-4" /> Agenda
            </button>
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition ml-2">
              <LogOut className="w-4 h-4" /> Déconnexion
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
