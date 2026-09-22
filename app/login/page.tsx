'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Scale, Lock, Mail, Eye, EyeOff } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-2xl mb-4">
            <Scale className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Cabinet Juridique</h1>
          <p className="text-blue-300 mt-1">Plateforme de gestion des dossiers</p>
        </div>

        {/* Carte — couleurs forcées pour ignorer le dark mode système */}
        <div className="bg-white rounded-2xl shadow-2xl p-8" style={{ colorScheme: 'light' }}>
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
              className="w-full font-semibold py-3 rounded-lg transition shadow-lg"
              style={{ background: loading ? '#93c5fd' : '#2563eb', color: '#ffffff' }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          Plateforme sécurisée — Cabinet Juridique © 2026
        </p>
        <p className="text-center text-xs mt-2">
          <span className="text-slate-400">Vous êtes client ? </span>
          <a href="/portail/login" className="text-blue-400 hover:underline">Accéder à l'espace client</a>
        </p>
      </div>
    </div>
  );
}
