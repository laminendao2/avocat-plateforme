'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Lock, Save, CheckCircle, AlertCircle, HardDrive, Link2, Link2Off, ExternalLink, Camera } from 'lucide-react';

export default function ParametresPage() {
  const [user, setUser]               = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword]   = useState('');
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [msgProfile, setMsgProfile]   = useState<{ type: 'success'|'error'; text: string } | null>(null);
  const [msgPassword, setMsgPassword] = useState<{ type: 'success'|'error'; text: string } | null>(null);
  const [loadingProfile,  setLoadingProfile]  = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Drive state
  const [driveConnected,  setDriveConnected]  = useState(false);
  const [driveConnectedAt, setDriveConnectedAt] = useState<string|null>(null);
  const [driveLoading,    setDriveLoading]    = useState(true);
  const [driveMsg,        setDriveMsg]        = useState<{ type: 'success'|'error'; text: string } | null>(null);
  const [photoURL,        setPhotoURL]        = useState<string | null>(null);
  const [avatarLoading,   setAvatarLoading]   = useState(false);
  const [avatarMsg,       setAvatarMsg]       = useState<{ type: 'success'|'error'; text: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      setUser(data.user);
      setDisplayName(data.user?.displayName ?? '');
      setPhotoURL(data.user?.photoURL ?? null);
    });
    fetchDriveStatus();

    // Message après retour OAuth
    const driveParam = searchParams.get('drive');
    if (driveParam === 'connected') {
      setDriveMsg({ type: 'success', text: 'Google Drive connecté avec succès !' });
      router.replace('/parametres');
    } else if (driveParam === 'error') {
      setDriveMsg({ type: 'error', text: 'La connexion Google Drive a échoué. Réessayez.' });
      router.replace('/parametres');
    }
  }, []);

  async function fetchDriveStatus() {
    setDriveLoading(true);
    const res = await fetch('/api/drive/status');
    const data = await res.json();
    setDriveConnected(data.connected);
    setDriveConnectedAt(data.connectedAt ?? null);
    setDriveLoading(false);
  }

  async function handleDisconnectDrive() {
    if (!confirm('Déconnecter Google Drive ? Les futurs uploads iront vers le stockage de secours.')) return;
    await fetch('/api/drive/disconnect', { method: 'POST' });
    setDriveConnected(false);
    setDriveConnectedAt(null);
    setDriveMsg({ type: 'success', text: 'Google Drive déconnecté.' });
  }

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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    setAvatarMsg(null);
    const form = new FormData();
    form.append('avatar', file);
    const res = await fetch('/api/auth/profile/avatar', { method: 'POST', body: form });
    const data = await res.json();
    setAvatarLoading(false);
    if (res.ok) {
      setPhotoURL(data.photoURL);
      setAvatarMsg({ type: 'success', text: 'Photo mise à jour !' });
    } else {
      setAvatarMsg({ type: 'error', text: data.error ?? "Erreur lors de l'upload." });
    }
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }

  const initials = (displayName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#0C1B3E' }}>Paramètres du compte</h1>

      {/* Avatar + infos */}
      <div className="flex items-center gap-4 mb-8 p-5 bg-white rounded-xl border shadow-sm" style={{ borderColor: 'rgba(12,27,62,0.08)' }}>
        <div className="relative flex-shrink-0">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div
            onClick={() => !avatarLoading && avatarInputRef.current?.click()}
            title="Changer la photo de profil"
            style={{
              width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
              cursor: avatarLoading ? 'default' : 'pointer', position: 'relative',
              flexShrink: 0,
            }}
          >
            {photoURL ? (
              <img src={photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : avatarLoading ? (
              <div style={{ width: '100%', height: '100%', background: '#0C1B3E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D4AF5A', borderTopColor: 'transparent' }} />
              </div>
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#0C1B3E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{
                  color: '#D4AF5A', fontSize: 22, fontWeight: 700,
                  fontFamily: "Georgia, serif", letterSpacing: 1, userSelect: 'none', lineHeight: 1,
                }}>
                  {initials || '?'}
                </span>
              </div>
            )}
          </div>
          {/* Small camera badge */}
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow"
            style={{ background: '#1D4ED8', pointerEvents: 'none' }}>
            <Camera className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold truncate" style={{ color: '#0C1B3E' }}>{displayName || user?.email}</p>
          <p className="text-sm" style={{ color: '#6B7A99' }}>{user?.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
            {user?.role ?? 'avocat'}
          </span>
          {avatarMsg && (
            <p className={`text-xs mt-1 ${avatarMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {avatarMsg.text}
            </p>
          )}
          <p className="text-xs mt-1 cursor-pointer underline" style={{ color: '#9CA3AF' }}
            onClick={() => avatarInputRef.current?.click()}>
            Cliquer sur la photo pour la modifier
          </p>
        </div>
      </div>

      {/* ── Google Drive ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-6" style={{ borderColor: 'rgba(12,27,62,0.08)' }}>
        <h2 className="flex items-center gap-2 font-semibold mb-1" style={{ color: '#0C1B3E' }}>
          <HardDrive className="w-4 h-4 text-blue-600" /> Stockage des documents
        </h2>
        <p className="text-sm mb-5" style={{ color: '#6B7A99' }}>
          Connectez votre Google Drive pour que les documents de vos clients soient automatiquement
          enregistrés dans votre propre Drive, dans un dossier <strong>Cabinet Juridique</strong>.
          Vous gardez le contrôle total de vos fichiers.
        </p>

        {driveMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-4 ${driveMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {driveMsg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {driveMsg.text}
          </div>
        )}

        {driveLoading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7A99' }}>
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Vérification…
          </div>
        ) : driveConnected ? (
          <div>
            {/* Statut connecté */}
            <div className="flex items-center gap-3 p-4 rounded-xl mb-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)' }}>
                <svg viewBox="0 0 87.3 78" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: '#166534' }}>Google Drive connecté</p>
                {driveConnectedAt && (
                  <p className="text-xs mt-0.5" style={{ color: '#4ADE80' }}>
                    Depuis le {new Date(driveConnectedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
              <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#22C55E' }} />
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="https://drive.google.com/drive/folders"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition hover:bg-gray-50"
                style={{ borderColor: 'rgba(12,27,62,0.15)', color: '#0C1B3E' }}
              >
                <ExternalLink className="w-4 h-4" />
                Ouvrir Google Drive
              </a>
              <button
                onClick={handleDisconnectDrive}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition hover:bg-red-50 hover:border-red-200"
                style={{ borderColor: 'rgba(12,27,62,0.15)', color: '#EF4444' }}
              >
                <Link2Off className="w-4 h-4" />
                Déconnecter
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Statut non connecté */}
            <div className="flex items-start gap-3 p-4 rounded-xl mb-5" style={{ background: '#F8F9FF', border: '1px solid rgba(12,27,62,0.08)' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#F97316' }} />
              <div className="text-sm" style={{ color: '#6B7A99' }}>
                <p className="font-medium mb-1" style={{ color: '#0C1B3E' }}>Drive non connecté</p>
                <p>Les documents uploadés par les clients seront stockés sur le serveur de la plateforme. Connectez Drive pour les garder dans votre propre espace.</p>
              </div>
            </div>

            <a
              href="/api/drive/auth"
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-white font-medium text-sm shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}
            >
              <Link2 className="w-4 h-4" />
              Connecter Google Drive
            </a>

            <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
              Vous serez redirigé vers Google pour autoriser l'accès à votre Drive.
              Seul le dossier <em>Cabinet Juridique</em> sera créé et utilisé.
            </p>
          </div>
        )}
      </div>

      {/* ── Informations personnelles ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-6" style={{ borderColor: 'rgba(12,27,62,0.08)' }}>
        <h2 className="flex items-center gap-2 font-semibold mb-5" style={{ color: '#0C1B3E' }}>
          <User className="w-4 h-4 text-blue-600" /> Informations personnelles
        </h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Nom d'affichage</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              style={{ borderColor: '#E5E7EB' }}
              placeholder="Votre nom complet"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Email</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full border rounded-lg px-4 py-2.5 bg-gray-50 cursor-not-allowed"
              style={{ borderColor: '#F3F4F6', color: '#9CA3AF' }}
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

      {/* ── Mot de passe ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: 'rgba(12,27,62,0.08)' }}>
        <h2 className="flex items-center gap-2 font-semibold mb-5" style={{ color: '#0C1B3E' }}>
          <Lock className="w-4 h-4 text-blue-600" /> Changer le mot de passe
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Mot de passe actuel</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              style={{ borderColor: '#E5E7EB' }} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Nouveau mot de passe</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              style={{ borderColor: '#E5E7EB' }} required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Confirmer le nouveau mot de passe</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              style={{ borderColor: '#E5E7EB' }} required />
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
