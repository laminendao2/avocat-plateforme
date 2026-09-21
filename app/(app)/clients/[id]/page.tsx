'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, MapPin, FolderOpen, Plus, Globe, KeyRound, X } from 'lucide-react';

const CATEGORIES: Record<string, string> = {
  contentieux: 'bg-red-100 text-red-700',
  creation_entreprise: 'bg-blue-100 text-blue-700',
  conseil_rh: 'bg-purple-100 text-purple-700',
  foncier: 'bg-green-100 text-green-700',
  autre: 'bg-gray-100 text-gray-600',
};

export default function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [showPortailModal, setShowPortailModal] = useState(false);
  const [portailPassword, setPortailPassword] = useState('');
  const [portailLoading, setPortailLoading] = useState(false);
  const [portailMsg, setPortailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/clients/${id}`).then(r => r.json()),
      fetch(`/api/dossiers?clientId=${id}`).then(r => r.json()),
    ]).then(([client, dossiersData]) => {
      setData({ client, dossiers: Array.isArray(dossiersData.dossiers) ? dossiersData.dossiers : Array.isArray(dossiersData) ? dossiersData : [] });
    });
  }, [id]);

  async function revokePortalAccess() {
    if (!confirm('Supprimer l\'accès portail de ce client ? Il ne pourra plus se connecter.')) return;
    setPortailLoading(true);
    setPortailMsg(null);
    const res = await fetch('/api/portail/setup', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: id }),
    });
    const json = await res.json();
    setPortailLoading(false);
    if (res.ok) {
      setPortailMsg({ type: 'success', text: 'Accès portail supprimé.' });
      // Refresh client data
      const updated = await fetch(`/api/clients/${id}`).then(r => r.json());
      setData((prev: any) => ({ ...prev, client: updated }));
    } else {
      setPortailMsg({ type: 'error', text: json.error || 'Erreur' });
    }
  }

  async function createPortalAccess() {
    if (!portailPassword || portailPassword.length < 6) {
      setPortailMsg({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' });
      return;
    }
    setPortailLoading(true);
    setPortailMsg(null);
    const res = await fetch('/api/portail/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: id, password: portailPassword }),
    });
    const json = await res.json();
    setPortailLoading(false);
    if (res.ok) {
      setPortailMsg({ type: 'success', text: `Accès portail créé pour ${json.email}` });
      setPortailPassword('');
      // Reload client to show "Accès actif" without page refresh
      const updated = await fetch(`/api/clients/${id}`).then(r => r.json());
      setData((prev: any) => ({ ...prev, client: updated }));
      setShowPortailModal(false);
    } else {
      setPortailMsg({ type: 'error', text: json.error || 'Erreur' });
    }
  }

  if (!data) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const { client, dossiers } = data;
  if (!client || client.error) return <div className="p-8 text-red-600">Client introuvable.</div>;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/clients" className="text-gray-400 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {client.type_personne === 'morale' ? client.raison_sociale : `${client.nom} ${client.prenom || ''}`}
          </h1>
          <span className="text-gray-400 font-mono text-sm">{client.reference}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">Coordonnées</h2>
            {client.telephone && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{client.telephone}</div>}
            {client.email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{client.email}</div>}
            {client.adresse && <div className="flex items-start gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />{client.adresse}</div>}
            {client.nif && <p className="text-xs text-gray-500">NIF : {client.nif}</p>}
            {client.rccm && <p className="text-xs text-gray-500">RCCM : {client.rccm}</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">Portail client</h2>
            {client.portalPasswordHash ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Globe className="w-4 h-4" />
                  <span>Accès actif</span>
                </div>
                <p className="text-xs text-gray-400">{client.email}</p>
                <button
                  onClick={() => { setShowPortailModal(true); setPortailMsg(null); }}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" /> Modifier le mot de passe
                </button>
                <button
                  onClick={revokePortalAccess}
                  disabled={portailLoading}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
                >
                  ✕ Supprimer l&apos;accès
                </button>
                {portailMsg && (
                  <p className={`text-xs rounded px-2 py-1 ${portailMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {portailMsg.text}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-400 mb-3">Ce client n&apos;a pas encore accès au portail.</p>
                <button
                  onClick={() => { setShowPortailModal(true); setPortailMsg(null); }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg w-full justify-center"
                >
                  <Globe className="w-4 h-4" /> Créer accès portail
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Dossiers ({dossiers.length})</h2>
            <Link href={`/dossiers/nouveau`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Nouveau dossier
            </Link>
          </div>
          {dossiers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aucun dossier</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dossiers.map((d: any) => (
                <Link key={d.id} href={`/dossiers/${d.id}`} className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-blue-200 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-gray-400">{d.reference}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORIES[d.categorie] || 'bg-gray-100 text-gray-600'}`}>{d.categorie?.replace('_', ' ')}</span>
                  </div>
                  <p className="font-semibold text-gray-800">{d.objet}</p>
                  <p className="text-xs text-gray-400 mt-1">{d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : ''}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Portail modal */}
      {showPortailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                {client.portalPasswordHash ? 'Modifier le mot de passe' : 'Créer accès portail'}
              </h3>
              <button onClick={() => setShowPortailModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {client.email ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email de connexion</p>
                  <p className="text-sm font-medium text-gray-800 bg-gray-50 rounded-lg px-3 py-2">{client.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {client.portalPasswordHash ? 'Nouveau mot de passe' : 'Mot de passe'}
                  </label>
                  <input
                    type="password"
                    value={portailPassword}
                    onChange={e => setPortailPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={e => e.key === 'Enter' && createPortalAccess()}
                  />
                </div>
                {portailMsg && (
                  <p className={`text-sm rounded-lg px-3 py-2 ${portailMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {portailMsg.text}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowPortailModal(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">
                    Annuler
                  </button>
                  <button
                    onClick={createPortalAccess}
                    disabled={portailLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium"
                  >
                    {portailLoading ? 'En cours…' : client.portalPasswordHash ? 'Mettre à jour' : 'Créer accès'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-red-500">Ce client n&apos;a pas d&apos;adresse email. Veuillez en ajouter une pour créer un accès portail.</p>
                <button onClick={() => setShowPortailModal(false)} className="mt-4 text-sm text-blue-600">Fermer</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
