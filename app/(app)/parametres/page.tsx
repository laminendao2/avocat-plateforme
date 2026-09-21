'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Save, CheckCircle, AlertCircle } from 'lucide-react';

export default function ParametresPage() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msgProfile, setMsgProfile] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [msgPassword, setMsgPassword] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      setUser(data.user);
      setDisplayName(data.user?.displayName ?? '');
    });
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setLoadingProfile(true);
    setMsgProfile(null);
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    });
    const data = await res.json();
    setLoadingProfile(false);
    if (res.ok) {
      setMsgProfile({ type: 'success', text: 'Nom mis à jour avec succès.' });
      router.refresh();
    } else {
      setMsgProfile({ type: 'error', text: data.error ?? 'Erreur lors de la mise à jour.' });
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsgPassword({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (newPassword.length < 6) {
      setMsgPassword({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' });
      return;
    }
    setLoadingPassword(true);
    setMsgPassword(null);
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoadingPassword(false);
    if (res.ok) {
      setMsgPassword({ type: 'success', text: 'Mot de passe modifié avec succès.' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } else {
      setMsgPassword({ type: 'error', text: data.error ?? 'Erreur lors du changement.' });
    }
  }

  const initials = (displayName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Paramètres du compte</h1>

      {/* Avatar + infos */}
      <div className="flex items-center gap-4 mb-8 p-5 bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          {initials}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{displayName || user?.email}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
            {user?.role ?? 'avocat'}
          </span>
        </div>
      </div>

      {/* Nom d'affichage */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="flex items-center gap-2 font-semibold text-gray-800 mb-5">
          <User className="w-4 h-4 text-blue-600" /> Informations personnelles
        </h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'affichage</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Votre nom complet"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full border border-gray-100 rounded-lg px-4 py-2.5 bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
          {msgProfile && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${msgProfile.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msgProfile.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {msgProfile.text}
            </div>
          )}
          <button
            type="submit"
            disabled={loadingProfile}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loadingProfile ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Mot de passe */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="flex items-center gap-2 font-semibold text-gray-800 mb-5">
          <Lock className="w-4 h-4 text-blue-600" /> Changer le mot de passe
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>
          {msgPassword && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${msgPassword.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msgPassword.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {msgPassword.text}
            </div>
          )}
          <button
            type="submit"
            disabled={loadingPassword}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {loadingPassword ? 'Modification…' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
