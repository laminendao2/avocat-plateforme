'use client';
import { useEffect, useState, useRef } from 'react';
import { Camera, Save, Lock, ExternalLink, CheckCircle, AlertCircle, Loader2, Building2 } from 'lucide-react';

function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function Msg({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
      {msg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {msg.text}
    </div>
  );
}

export default function ParametresPage() {
  // User profile
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  // Password
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Google Drive
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [driveLoading, setDriveLoading] = useState(true);

  // Cabinet settings
  const [cabinetNom, setCabinetNom] = useState('');
  const [cabinetLogoUrl, setCabinetLogoUrl] = useState<string | null>(null);
  const [savingCabinet, setSavingCabinet] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [cabinetMsg, setCabinetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setDisplayName(d.displayName || '');
      setEmail(d.email || '');
      setAvatarUrl(d.photoURL || null);
    });
    fetch('/api/drive/status').then(r => r.json()).then(d => setDriveStatus(d)).catch(() => {}).finally(() => setDriveLoading(false));
    fetch('/api/parametres/cabinet').then(r => r.json()).then(d => {
      setCabinetNom(d.cabinetNom || 'Cabinet Juridique');
      setCabinetLogoUrl(d.cabinetLogoUrl || null);
    });
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
    if (newPwd.length < 6) { setPwdMsg({ type: 'error', text: 'Minimum 6 caractères.' }); return; }
    setSavingPwd(true); setPwdMsg(null);
    const res = await fetch('/api/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }) });
    setSavingPwd(false);
    if (res.ok) { setPwdMsg({ type: 'success', text: 'Mot de passe modifié.' }); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); }
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

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingLogo(true); setCabinetMsg(null);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/parametres/cabinet/logo', { method: 'POST', body: fd });
    if (res.ok) { const d = await res.json(); setCabinetLogoUrl(d.cabinetLogoUrl); setCabinetMsg({ type: 'success', text: 'Logo mis à jour.' }); }
    else setCabinetMsg({ type: 'error', text: 'Erreur lors du téléversement.' });
    setUploadingLogo(false);
  }

  async function saveCabinet(e: React.FormEvent) {
    e.preventDefault();
    setSavingCabinet(true); setCabinetMsg(null);
    const res = await fetch('/api/parametres/cabinet', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cabinetNom }) });
    setSavingCabinet(false);
    setCabinetMsg(res.ok ? { type: 'success', text: 'Nom du cabinet mis à jour.' } : { type: 'error', text: 'Erreur.' });
    if (res.ok) window.location.reload();
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
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold" style={{ color: '#0C1B3E' }}>Paramètres du Compte</h1>

      {/* ── Cabinet ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Identité du Cabinet
        </h2>
        <form onSubmit={saveCabinet} className="space-y-4">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo du cabinet</label>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {cabinetLogoUrl ? (
                  <img src={cabinetLogoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-gray-200 bg-gray-50 p-1" />
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50">
                    <Building2 className="w-7 h-7 text-gray-300" />
                  </div>
                )}
                <button type="button" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition shadow-sm">
                  {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin text-gray-500" /> : <Camera className="w-3 h-3 text-gray-500" />}
                </button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
              </div>
              <div>
                <button type="button" onClick={() => logoRef.current?.click()}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  {cabinetLogoUrl ? 'Changer le logo' : 'Téléverser un logo'}
                </button>
                <p className="text-xs text-gray-400 mt-0.5">PNG, JPG ou SVG · max 5 Mo</p>
              </div>
            </div>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du cabinet</label>
            <input value={cabinetNom} onChange={e => setCabinetNom(e.target.value)} required
              placeholder="Ex : Cabinet Dupont & Associés"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <Msg msg={cabinetMsg} />

          <button type="submit" disabled={savingCabinet}
            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
            style={{ background: '#0C1B3E' }}>
            {savingCabinet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingCabinet ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* ── Profil ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
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
            <button type="button" onClick={() => avatarRef.current?.click()} disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-7 h-7 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition shadow-sm">
              {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" /> : <Camera className="w-3.5 h-3.5 text-gray-500" />}
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-lg">{displayName || 'Utilisateur'}</p>
            <p className="text-gray-500 text-sm">{email}</p>
            <button type="button" onClick={() => avatarRef.current?.click()} className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Camera className="w-3 h-3" /> Modifier la photo
            </button>
          </div>
        </div>
      </div>

      {/* ── Google Drive ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">Stockage des documents</h2>
        <p className="text-sm text-gray-500 mb-4">Connectez votre Google Drive pour que vos documents soient automatiquement sauvegardés.</p>
        {driveLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : driveStatus?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">Drive Connecté avec succès</span>
            </div>
            {driveStatus.connectedAt && <p className="text-xs text-gray-400">Depuis le {new Date(driveStatus.connectedAt).toLocaleDateString('fr-FR')}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={() => window.open('https://drive.google.com', '_blank')}
                className="flex items-center gap-2 text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
                <ExternalLink className="w-3.5 h-3.5" /> Ouvrir Google Drive
              </button>
              <button onClick={disconnectDrive}
                className="flex items-center gap-2 text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
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

      {/* ── Infos personnelles ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-5">Informations personnelles</h2>
        <form onSubmit={saveInfo} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom d&apos;affichage</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={email} disabled className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          <Msg msg={infoMsg} />
          <button type="submit" disabled={savingInfo}
            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
            style={{ background: '#0C1B3E' }}>
            {savingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingInfo ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* ── Mot de passe ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Changer le mot de passe
        </h2>
        <form onSubmit={savePwd} className="space-y-4">
          {[
            ['Mot de passe actuel', currentPwd, setCurrentPwd],
            ['Nouveau mot de passe', newPwd, setNewPwd],
            ['Confirmer le nouveau mot de passe', confirmPwd, setConfirmPwd],
          ].map(([label, val, setter]: any) => (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type="password" value={val} onChange={(e: any) => setter(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <Msg msg={pwdMsg} />
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
