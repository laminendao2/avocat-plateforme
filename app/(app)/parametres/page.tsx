'use client';
import { useEffect, useState, useRef } from 'react';
import { Camera, Save, Lock, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function ParametresPage() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [driveLoading, setDriveLoading] = useState(true);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUser(d);
      setDisplayName(d.displayName || '');
      setEmail(d.email || '');
      setAvatarUrl(d.photoURL || null);
    });
    fetch('/api/drive/status').then(r => r.json()).then(d => { setDriveStatus(d); setDriveLoading(false); }).catch(() => setDriveLoading(false));
  }, []);

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    setSavingInfo(true); setInfoMsg(null);
    const res = await fetch('/api/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName }) });
    setSavingInfo(false);
    setInfoMsg(res.ok ? { type: 'success', text: 'Profil mis à jour.' } : { type: 'error', text: 'Erreur lors de la mise à jour.' });
  }

  async function savePwd(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) { setPwdMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' }); return; }
    if (newPwd.length < 6) { setPwdMsg({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' }); return; }
    setSavingPwd(true); setPwdMsg(null);
    const res = await fetch('/api/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }) });
    setSavingPwd(false);
    if (res.ok) { setPwdMsg({ type: 'success', text: 'Mot de passe modifié avec succès.' }); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); }
    else { const d = await res.json(); setPwdMsg({ type: 'error', text: d.error || 'Erreur.' }); }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingAvatar(true);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/auth/profile/avatar', { method: 'POST', body: fd });
    if (res.ok) { const d = await res.json(); setAvatarUrl(d.photoURL); }
    setUploadingAvatar(false);
  }

  async function connectDrive() {
    const res = await fetch('/api/drive/auth'); const d = await res.json();
    if (d.url) window.open(d.url, '_blank');
  }
  async function disconnectDrive() {
    if (!confirm('Déconnecter Google Drive ?')) return;
    await fetch('/api/drive/disconnect', { method: 'POST' });
    setDriveStatus(null);
  }

  const initials = getInitials(displayName || email || '?');

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#0C1B3E' }}>Paramètres du Compte</h1>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-5">Profil Utilisateur</h2>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100" />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold ring-4 ring-gray-100"
                style={{ background: 'linear-gradient(135deg, #0C1B3E, #1e3a6e)' }}>
                {initials}
              </div>
            )}
            <button onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-7 h-7 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition shadow-sm">
              {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" /> : <Camera className="w-3.5 h-3.5 text-gray-500" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-lg">{displayName || 'Utilisateur'}</p>
            <p className="text-gray-500 text-sm">{email}</p>
            <button onClick={() => fileRef.current?.click()} className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Camera className="w-3 h-3" /> Modifier la photo
            </button>
          </div>
        </div>
      </div>

      {/* Google Drive */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">Stockage des documents</h2>
        <p className="text-sm text-gray-500 mb-4">Connectez votre Google Drive pour que vos documents soient automatiquement sauvegardés dans vos fichiers.</p>
        {driveLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : driveStatus?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">Drive Connecté avec succès</span>
            </div>
            {driveStatus.connectedAt && (
              <p className="text-xs text-gray-400">Depuis le {new Date(driveStatus.connectedAt).toLocaleDateString('fr-FR')}</p>
            )}
            <div className="flex gap-3 mt-2">
              <button onClick={() => window.open('https://drive.google.com', '_blank')}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
                <ExternalLink className="w-3.5 h-3.5" /> Ouvrir Google Drive
              </button>
              <button onClick={disconnectDrive}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
                Déconnecter
              </button>
            </div>
          </div>
        ) : (
          <button onClick={connectDrive}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition"
            style={{ background: '#0C1B3E' }}>
            <ExternalLink className="w-4 h-4" /> Connecter Google Drive
          </button>
        )}
      </div>

      {/* Informations personnelles */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-5">Informations personnelles</h2>
        <form onSubmit={saveInfo} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom d&apos;affichage</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={email} disabled
              className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          {infoMsg && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${infoMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {infoMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {infoMsg.text}
            </div>
          )}
          <button type="submit" disabled={savingInfo}
            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
            style={{ background: '#0C1B3E' }}>
            {savingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingInfo ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Changer mot de passe */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Changer le mot de passe
        </h2>
        <form onSubmit={savePwd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
            <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {pwdMsg && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${pwdMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {pwdMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {pwdMsg.text}
            </div>
          )}
          <button type="submit" disabled={savingPwd}
            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
            style={{ background: '#0C1B3E' }}>
            {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {savingPwd ? 'Modification…' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
