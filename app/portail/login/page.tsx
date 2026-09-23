'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Eye, EyeOff, Lock } from 'lucide-react';
import LogoCJ from '@/components/LogoCJ';

export default function PortailLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/portail/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) router.push('/portail');
    else { const d = await res.json(); setError(d.error || 'Erreur de connexion'); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0C1B3E 0%, #163060 60%, #1a3a6e 100%)' }}>
      <div className="w-full max-w-md">

        {/* Logo + titre */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <LogoCJ variant="dark" size={88} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide"
            style={{ fontFamily: 'Georgia, serif' }}>Cabinet Juridique</h1>
          <p className="text-blue-300 text-sm mt-1 tracking-widest uppercase"
            style={{ fontSize: '10px', letterSpacing: '0.2em' }}>Espace Client</p>
          <div className="w-8 h-px bg-yellow-500/60 mx-auto mt-3" style={{ background: '#B8963E' }}></div>
        </div>

        {/* Carte formulaire — couleurs forcées light */}
        <div className="rounded-2xl p-8 shadow-2xl" style={{ background: '#FFFFFF', colorScheme: 'light' }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: '#0C1B3E' }}>Connexion</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="votre@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500"
                  style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' }}
                />
              </div>
            </div>

            {/* Mot de passe avec affichage */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type={showPwd ? 'text' : 'password'} required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500"
                  style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition"
                  style={{ color: '#9ca3af' }}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full font-semibold py-3 rounded-lg transition shadow-lg"
              style={{ background: loading ? '#93c5fd' : '#0C1B3E', color: '#ffffff' }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-xs" style={{ color: 'rgba(147,197,253,0.6)' }}>
            Vos identifiants ont été communiqués par votre avocat
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg transition"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Connexion professionnelle
          </a>
        </div>
      </div>
    </div>
  );
}
