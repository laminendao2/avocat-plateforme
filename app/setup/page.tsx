'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, CheckCircle } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nom: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    if (form.password.length < 6) { setError('Mot de passe minimum 6 caractères'); return; }
    const res = await fetch('/api/auth/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { setDone(true); setTimeout(() => router.push('/login'), 2000); }
    else { const d = await res.json(); setError(d.error || 'Erreur'); }
  }

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center">
      <div className="text-center text-white">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Compte créé !</h2>
        <p className="text-blue-300 mt-2">Redirection vers la connexion...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Configuration initiale</h1>
          <p className="text-blue-300 text-sm mt-1">Créer le compte administrateur du cabinet</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nom complet *</label>
              <input required value={form.nom} onChange={e => setForm(f => ({...f, nom: e.target.value}))} placeholder="Maître Prénom NOM" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Mot de passe *</label>
              <input required type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Confirmer le mot de passe *</label>
              <input required type="password" value={form.confirm} onChange={e => setForm(f => ({...f, confirm: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition mt-2">
              Créer le compte administrateur
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
