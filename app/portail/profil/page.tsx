'use client';
import { useEffect, useRef, useState } from 'react';
import { User, Mail, Phone, MapPin, Briefcase, Hash, Calendar, Camera } from 'lucide-react';

interface ClientProfile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  typeClient: string;
  entreprise: string;
  reference: string;
  photoURL: string | null;
  createdAt: string | null;
}

export default function ProfilPage() {
  const [profile, setProfile]           = useState<ClientProfile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/portail/me')
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Erreur');
        return r.json();
      })
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    setAvatarMsg(null);
    const form = new FormData();
    form.append('avatar', file);
    const res = await fetch('/api/portail/me/avatar', { method: 'POST', body: form });
    const data = await res.json();
    setAvatarLoading(false);
    if (res.ok) {
      setProfile((prev) => prev ? { ...prev, photoURL: data.photoURL } : prev);
      setAvatarMsg({ type: 'success', text: 'Photo mise à jour !' });
    } else {
      setAvatarMsg({ type: 'error', text: data.error ?? "Erreur lors de l'upload." });
    }
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: '#D4AF5A', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: '#fff3cd' }}>
        <p className="text-amber-800">{error}</p>
      </div>
    );
  }

  if (!profile) return null;

  const initials = `${profile.prenom?.[0] ?? ''}${profile.nom?.[0] ?? ''}`.toUpperCase();
  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const fields = [
    { icon: Mail,      label: 'Email',           value: profile.email },
    { icon: Phone,     label: 'Téléphone',        value: profile.telephone || '—' },
    { icon: MapPin,    label: 'Adresse',           value: profile.adresse || '—' },
    { icon: Briefcase, label: 'Type de client',    value: profile.typeClient === 'entreprise' ? 'Entreprise' : 'Particulier' },
    ...(profile.entreprise ? [{ icon: Briefcase, label: 'Entreprise', value: profile.entreprise }] : []),
    { icon: Hash,      label: 'Référence client',  value: profile.reference || '—' },
    ...(joinDate ? [{ icon: Calendar, label: 'Client depuis', value: joinDate }] : []),
  ];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Avatar card */}
      <div className="rounded-2xl shadow-sm p-6 text-center"
        style={{ background: 'white', border: '1px solid rgba(12,27,62,0.08)' }}>

        {/* Clickable avatar */}
        <div className="relative inline-block mb-4">
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
              width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
              cursor: avatarLoading ? 'default' : 'pointer', position: 'relative',
              flexShrink: 0,
            }}
          >
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : avatarLoading ? (
              <div style={{ width: '100%', height: '100%', background: '#0C1B3E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: '#D4AF5A', borderTopColor: 'transparent' }} />
              </div>
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: '#0C1B3E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{
                  color: '#D4AF5A', fontSize: 26, fontWeight: 700,
                  fontFamily: "Georgia, serif", letterSpacing: 1, userSelect: 'none', lineHeight: 1,
                }}>
                  {initials || '?'}
                </span>
              </div>
            )}
          </div>
          {/* Camera badge */}
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow"
            style={{ background: '#D4AF5A', pointerEvents: 'none' }}>
            <Camera className="w-2.5 h-2.5 text-white" />
          </div>
        </div>

        <h1 className="text-xl font-semibold" style={{ color: '#0C1B3E', fontFamily: 'Georgia, serif' }}>
          {profile.prenom} {profile.nom}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>{profile.email}</p>
        {profile.reference && (
          <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(212,175,90,0.12)', color: '#b8963e' }}>
            Réf. {profile.reference}
          </span>
        )}

        {avatarMsg && (
          <p className={`text-xs mt-3 ${avatarMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {avatarMsg.text}
          </p>
        )}
        <p className="text-xs mt-2 cursor-pointer underline" style={{ color: '#9CA3AF' }}
          onClick={() => avatarInputRef.current?.click()}>
          Cliquer sur la photo pour la modifier
        </p>
      </div>

      {/* Info fields */}
      <div className="rounded-2xl shadow-sm overflow-hidden"
        style={{ background: 'white', border: '1px solid rgba(12,27,62,0.08)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(12,27,62,0.06)' }}>
          <h2 className="font-semibold text-sm uppercase tracking-wide"
            style={{ color: '#0C1B3E', letterSpacing: '0.08em' }}>
            Informations personnelles
          </h2>
        </div>
        <ul>
          {fields.map(({ icon: Icon, label, value }, i) => (
            <li key={label} className="flex items-start gap-4 px-5 py-4"
              style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(12,27,62,0.05)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(12,27,62,0.05)' }}>
                <Icon className="w-4 h-4" style={{ color: '#0C1B3E' }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium mb-0.5" style={{ color: '#9ca3af' }}>{label}</p>
                <p className="text-sm" style={{ color: '#1f2937', wordBreak: 'break-word' }}>{value}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs" style={{ color: '#9ca3af' }}>
        Pour modifier vos informations, veuillez contacter votre avocat.
      </p>
    </div>
  );
}
