'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import LogoCJ from '@/components/LogoCJ';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      router.push('/dashboard');
    } else {
      setError(data.error || 'Erreur de connexion');
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Halos décoratifs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 w-56 h-56 bg-blue-400/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <LogoCJ variant="dark" size={88} />
          </div>
          <h1 className="text-3xl font-bold text-white">Cabinet Juridique</h1>
          <p className="text-blue-300 mt-1">Plateforme de gestion des dossiers</p>
        </div>

        {/* Carte — couleurs forcées pour ignorer le dark mode système */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 p-8 ring-1 ring-black/5" style={{ colorScheme: 'light' }}>
          <h2 className="text-xl font-semibold mb-6" style={{ color: '#1f2937' }}>Connexion</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500"
                  style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500"
                  style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: '#9ca3af' }}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: loading ? '#93c5fd' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#ffffff' }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          Plateforme sécurisée — Cabinet Juridique © 2026
        </p>
        <div className="text-center mt-2">
          <a
            href="/portail/login"
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg transition"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Espace client
          </a>
        </div>
      </div>
    </div>
  );
}
