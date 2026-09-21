'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DocumentUpload from '@/components/DocumentUpload';
import { Trash2, Eye, EyeOff, Users } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
}

interface Dossier {
  id: string;
  reference: string;
  titre: string;
  description: string;
  statut: 'ouvert' | 'en_cours' | 'en_attente' | 'cloture';
  categorie: string;
  priorite: 'normale' | 'urgente' | 'haute';
  dateEcheance: string | null;
  montantHonoraires: number;
  clientId: string;
  client?: Client;
  associesVisibleClient?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Action {
  id: string;
  type: string;
  description: string;
  heures: number;
  montant: number;
  auteurId: string;
  createdAt: string;
  visibleClient?: boolean;
  visibleAssocies?: boolean;
  archived?: boolean;
  updatedAt?: string;
}

interface Document {
  id: string;
  nom: string;
  nomOriginal: string;
  url: string;
  type: string;
  taille: number;
  storagePath?: string;
  uploadedByClient?: boolean;
  uploadedAt: string;
  visibleClient?: boolean;
  visibleAssocies?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<string, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  en_attente: 'En attente',
  cloture: 'Clôturé',
};

const STATUT_COLORS: Record<string, string> = {
  ouvert: 'bg-blue-100 text-blue-800',
  en_cours: 'bg-yellow-100 text-yellow-800',
  en_attente: 'bg-gray-100 text-gray-700',
  cloture: 'bg-green-100 text-green-800',
};

const PRIORITE_COLORS: Record<string, string> = {
  normale: 'bg-gray-100 text-gray-700',
  haute: 'bg-orange-100 text-orange-800',
  urgente: 'bg-red-100 text-red-800',
};

const CATEGORIE_LABELS: Record<string, string> = {
  creation_entreprise: 'Création d\'entreprise',
  contentieux: 'Contentieux',
  conseil_rh: 'Conseil RH',
  foncier: 'Foncier',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  audience: 'Audience',
  redaction: 'Rédaction',
  correspondance: 'Correspondance',
  recherche: 'Recherche',
  note_interne: 'Note interne',
  autre: 'Autre',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function docIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('word')) return '📝';
  return '📎';
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'details' | 'actions' | 'documents' | 'associes';

export default function DossierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action form
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionForm, setActionForm] = useState({
    type: 'consultation',
    description: '',
    heures: '',
    montant: '',
  });
  const [submittingAction, setSubmittingAction] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Paiements
  const [paiements, setPaiements] = useState<any[]>([]);
  const [showPaiementForm, setShowPaiementForm] = useState(false);
  const [paiementForm, setPaiementForm] = useState({ montant: '', date: new Date().toISOString().slice(0,10), note: '' });

  const fetchPaiements = useCallback(async () => {
    const res = await fetch(`/api/dossiers/${id}/paiements`);
    if (res.ok) { const d = await res.json(); setPaiements(d.paiements || []); }
  }, [id]);

  // Associés
  const [associes, setAssocies] = useState<{id:string;displayName:string;email:string}[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [selectedAssocieId, setSelectedAssocieId] = useState('');
  const [addingAssocie, setAddingAssocie] = useState(false);
  const [associeError, setAssocieError] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<{id:string;email:string;createdAt:string|null}[]>([]);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [notFoundEmail, setNotFoundEmail] = useState('');

  // Edit action
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [editActionForm, setEditActionForm] = useState({ type: 'consultation', description: '', heures: '', montant: '' });
  const [savingEditAction, setSavingEditAction] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Edit dossier
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchDossier = useCallback(async () => {
    const res = await fetch(`/api/dossiers/${id}`);
    if (!res.ok) {
      if (res.status === 401) { router.push('/login'); return; }
      throw new Error('Dossier introuvable');
    }
    const data = await res.json();
    setDossier(data);
    setAssocies(data.associesData ?? []);
    setIsOwner(data.isOwner ?? false);
  }, [id, router]);

  const fetchInvitations = useCallback(async () => {
    const res = await fetch(`/api/dossiers/${id}/invitations`);
    if (res.ok) {
      const data = await res.json();
      setPendingInvitations(data.invitations ?? []);
    }
  }, [id]);

  const fetchActions = useCallback(async () => {
    const res = await fetch(`/api/dossiers/${id}/actions`);
    if (res.ok) {
      const data = await res.json();
      setActions(data.actions);
    }
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch(`/api/dossiers/${id}/documents`);
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await fetchDossier();
        await Promise.all([fetchActions(), fetchDocuments(), fetchPaiements(), fetchInvitations()]);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchDossier, fetchActions, fetchDocuments, fetchPaiements, fetchInvitations]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionForm.description.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/dossiers/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: actionForm.type,
          description: actionForm.description,
          heures: parseFloat(actionForm.heures) || 0,
          montant: parseFloat(actionForm.montant) || 0,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const newAction = await res.json();
      setActions((prev) => [newAction, ...prev]);
      setActionForm({ type: 'consultation', description: '', heures: '', montant: '' });
      setShowActionForm(false);
    } catch (e: any) {
      alert(`Erreur: ${e.message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleStatusChange = async (statut: string) => {
    if (!dossier || statut === dossier.statut) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/dossiers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setDossier(updated);
    } catch (e: any) {
      alert(`Erreur: ${e.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };


  const handleDeleteDocument = async (docId: string, storagePath: string) => {
    if (!confirm('Supprimer ce document définitivement ?')) return;
    const res = await fetch(`/api/dossiers/${id}/documents/${docId}`, { method: 'DELETE' });
    if (res.ok) {
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } else {
      const data = await res.json();
      alert(data.error || 'Erreur lors de la suppression');
    }
  };

  const handleDocumentUploaded = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const toggleVisibility = async (
    collection: 'documents' | 'actions' | 'paiements',
    itemId: string,
    field: 'visibleClient' | 'visibleAssocies',
    current: boolean
  ) => {
    const res = await fetch(`/api/dossiers/${id}/${collection}/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !current }),
    });
    if (!res.ok) return;
    if (collection === 'documents') {
      setDocuments(prev => prev.map(d => d.id === itemId ? { ...d, [field]: !current } : d));
    } else if (collection === 'actions') {
      setActions(prev => prev.map(a => a.id === itemId ? { ...a, [field]: !current } : a));
    } else {
      setPaiements(prev => prev.map(p => p.id === itemId ? { ...p, [field]: !current } : p));
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!confirm('Supprimer cette action définitivement ?')) return;
    const res = await fetch(`/api/dossiers/${id}/actions/${actionId}`, { method: 'DELETE' });
    if (res.ok) {
      setActions(prev => prev.filter(a => a.id !== actionId));
    } else {
      alert('Erreur lors de la suppression');
    }
  };

  const handleToggleArchive = async (action: Action) => {
    if (!action.archived) {
      if (!confirm('Archiver cette action ?')) return;
    }
    const res = await fetch(`/api/dossiers/${id}/actions/${action.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: !action.archived }),
    });
    if (res.ok) {
      setActions(prev => prev.map(a => a.id === action.id ? { ...a, archived: !a.archived } : a));
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Erreur lors de l'archivage");
    }
  };

  const handleSaveEditAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAction) return;
    setSavingEditAction(true);
    const res = await fetch(`/api/dossiers/${id}/actions/${editingAction.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: editActionForm.type,
        description: editActionForm.description,
        heures: parseFloat(editActionForm.heures) || 0,
        montant: parseFloat(editActionForm.montant) || 0,
      }),
    });
    setSavingEditAction(false);
    if (res.ok) {
      setActions(prev => prev.map(a => a.id === editingAction.id ? {
        ...a,
        type: editActionForm.type,
        description: editActionForm.description,
        heures: parseFloat(editActionForm.heures) || 0,
        montant: parseFloat(editActionForm.montant) || 0,
      } : a));
      setEditingAction(null);
    } else {
      alert('Erreur lors de la modification');
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg text-gray-600">{error ?? 'Dossier introuvable'}</p>
        <button
          onClick={() => router.push('/dossiers')}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Retour aux dossiers
        </button>
      </div>
    );
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    setEditError(null);
    const res = await fetch(`/api/dossiers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: editForm.titre,
        objet: editForm.titre,
        categorie: editForm.categorie,
        description: editForm.description,
        priorite: editForm.priorite,
        dateEcheance: editForm.dateEcheance,
        montantHonoraires: editForm.montantHonoraires ? Number(editForm.montantHonoraires) : 0,
      }),
    });
    setSavingEdit(false);
    if (res.ok) {
      setShowEdit(false);
      fetchDossier();
    } else {
      const d = await res.json().catch(() => ({}));
      setEditError(d.error || 'Erreur lors de la sauvegarde');
    }
  }


  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => router.push('/dossiers')} className="hover:underline">
              Dossiers
            </button>
            <span>/</span>
            <span className="font-mono">{dossier.reference}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{dossier.titre}</h1>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_COLORS[dossier.statut]}`}>
              {STATUT_LABELS[dossier.statut]}
            </span>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITE_COLORS[dossier.priorite]}`}>
              {dossier.priorite.charAt(0).toUpperCase() + dossier.priorite.slice(1)}
            </span>
            <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
              {CATEGORIE_LABELS[dossier.categorie] ?? dossier.categorie}
            </span>
          </div>
        </div>

        {/* Quick status change */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Changer le statut</label>
          <select
            value={dossier.statut}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updatingStatus}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
          >
            {Object.entries(STATUT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setEditForm({ titre: dossier.titre || dossier.objet, categorie: dossier.categorie, description: dossier.description, priorite: dossier.priorite, dateEcheance: dossier.dateEcheance?.slice(0,10) ?? '', montantHonoraires: dossier.montantHonoraires ?? 0 }); setShowEdit(true); setEditError(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
        >
          ✏️ Modifier
        </button>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Modifier le dossier</h2>
            {editError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{editError}</div>}
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objet du dossier *</label>
                <input required value={editForm.titre ?? ''} onChange={e => setEditForm((f: any) => ({...f, titre: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
                <select required value={editForm.categorie ?? ''} onChange={e => setEditForm((f: any) => ({...f, categorie: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="contentieux">Contentieux</option>
                  <option value="creation_entreprise">Création Entreprise</option>
                  <option value="conseil_rh">Conseil Juridique RH</option>
                  <option value="foncier">Foncier / Administratif</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={editForm.description ?? ''} onChange={e => setEditForm((f: any) => ({...f, description: e.target.value}))} rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                  <select value={editForm.priorite ?? 'normale'} onChange={e => setEditForm((f: any) => ({...f, priorite: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
                  <input type="date" value={editForm.dateEcheance ?? ''} onChange={e => setEditForm((f: any) => ({...f, dateEcheance: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Honoraires (FCFA)</label>
                <input type="number" value={editForm.montantHonoraires ?? 0} onChange={e => setEditForm((f: any) => ({...f, montantHonoraires: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Annuler</button>
                <button type="submit" disabled={savingEdit} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                  {savingEdit ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(['details', 'actions', 'documents', ...(isOwner ? ['associes'] : [])] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'border-b-2 pb-3 text-sm font-medium capitalize transition-colors',
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              ].join(' ')}
            >
              {tab === 'details' ? 'Détails' : tab === 'actions' ? `Actions (${actions.filter(a => !a.archived).length})` : tab === 'documents' ? `Documents (${documents.length})` : `Associés (${associes.length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Dossier info */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Informations du dossier</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Référence</dt>
                <dd className="font-mono font-medium">{dossier.reference}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Catégorie</dt>
                <dd>{CATEGORIE_LABELS[dossier.categorie] ?? dossier.categorie}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Honoraires convenus</dt>
                <dd className="font-medium">
                  {(dossier.montantHonoraires ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })}
                </dd>
              </div>
              {(() => {
                const totalPaye = paiements.reduce((s, p) => s + (p.montant ?? 0), 0);
                const restant = (dossier.montantHonoraires ?? 0) - totalPaye;
                return (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Total avances</dt>
                      <dd className="font-medium text-green-700">{totalPaye.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Restant dû</dt>
                      <dd className={`font-medium ${restant > 0 ? 'text-red-600' : 'text-green-700'}`}>{restant.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })}</dd>
                    </div>
                  </>
                );
              })()}
              <div className="flex justify-between">
                <dt className="text-gray-500">Échéance</dt>
                <dd>{formatDate(dossier.dateEcheance)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Ouvert le</dt>
                <dd>{formatDate(dossier.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Mis à jour</dt>
                <dd>{formatDate(dossier.updatedAt)}</dd>
              </div>
            </dl>
            {/* Avances de paiement */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Avances de paiement</h3>
                <button onClick={() => setShowPaiementForm(v => !v)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Ajouter</button>
              </div>
              {showPaiementForm && (
                <form onSubmit={async e => {
                  e.preventDefault();
                  const res = await fetch(`/api/dossiers/${id}/paiements`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ montant: Number(paiementForm.montant), date: paiementForm.date, note: paiementForm.note }) });
                  if (res.ok) { setPaiementForm({ montant: '', date: new Date().toISOString().slice(0,10), note: '' }); setShowPaiementForm(false); fetchPaiements(); }
                }} className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Montant (FCFA) *</label>
                    <input required type="number" value={paiementForm.montant} onChange={e => setPaiementForm(f => ({...f, montant: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Date *</label>
                    <input required type="date" value={paiementForm.date} onChange={e => setPaiementForm(f => ({...f, date: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Note</label>
                    <input value={paiementForm.note} onChange={e => setPaiementForm(f => ({...f, note: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: chèque, espèces..." />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button type="button" onClick={() => setShowPaiementForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-1.5 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-sm hover:bg-blue-700">Enregistrer</button>
                  </div>
                </form>
              )}
              {paiements.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">Aucune avance enregistrée</p>
              ) : (
                <div className="space-y-2">
                  {paiements.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="font-medium text-gray-800">{(p.montant ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })}</span>
                        {p.note && <span className="text-gray-400 ml-2 text-xs">— {p.note}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">{formatDate(p.date)}</span>
                        {isOwner && (
                          <>
                            <button
                              onClick={() => toggleVisibility('paiements', p.id, 'visibleClient', p.visibleClient ?? false)}
                              title={p.visibleClient ? 'Visible par le client' : 'Masqué au client'}
                              className={`p-1 rounded transition ${p.visibleClient ? 'text-green-600' : 'text-gray-300 hover:text-gray-500'}`}
                            >
                              {p.visibleClient ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => toggleVisibility('paiements', p.id, 'visibleAssocies', p.visibleAssocies ?? true)}
                              title={p.visibleAssocies !== false ? 'Visible par les associés' : 'Masqué aux associés'}
                              className={`p-1 rounded transition ${p.visibleAssocies !== false ? 'text-blue-600' : 'text-gray-300 hover:text-gray-500'}`}
                            >
                              {p.visibleAssocies !== false ? <Users className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                        <button onClick={async () => { if (!confirm('Supprimer ce paiement ?')) return; await fetch(`/api/dossiers/${id}/paiements/${p.id}`, { method: 'DELETE' }); fetchPaiements(); }} className="text-gray-300 hover:text-red-500 transition">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {dossier.description && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{dossier.description}</p>
              </div>
            )}
          </div>

          {/* Client info */}
          {dossier.client && (
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="font-semibold text-gray-900">Client</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Nom</dt>
                  <dd className="font-medium">
                    {dossier.client.prenom} {dossier.client.nom}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Email</dt>
                  <dd>
                    <a href={`mailto:${dossier.client.email}`} className="text-blue-600 hover:underline">
                      {dossier.client.email}
                    </a>
                  </dd>
                </div>
                {dossier.client.telephone && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Téléphone</dt>
                    <dd>
                      <a href={`tel:${dossier.client.telephone}`} className="hover:underline">
                        {dossier.client.telephone}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              <button
                onClick={() => router.push(`/clients/${dossier.clientId}`)}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Voir la fiche client →
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Journal des actions</h2>
            <button
              onClick={() => setShowActionForm((v) => !v)}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Nouvelle action
            </button>
          </div>

          {/* New action form */}
          {showActionForm && (
            <form
              onSubmit={handleSubmitAction}
              className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-4"
            >
              <h3 className="font-medium text-blue-900">Ajouter une action</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={actionForm.type}
                    onChange={(e) => setActionForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heures</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={actionForm.heures}
                    onChange={(e) => setActionForm((f) => ({ ...f, heures: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={actionForm.description}
                  onChange={(e) => setActionForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Décrivez l'action effectuée..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingAction ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowActionForm(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          {/* Edit action modal */}
          {editingAction && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-5">Modifier l'action</h2>
                <form onSubmit={handleSaveEditAction} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select value={editActionForm.type} onChange={e => setEditActionForm(f => ({...f, type: e.target.value}))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        {Object.entries(ACTION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Heures</label>
                      <input type="number" step="0.25" min="0" value={editActionForm.heures}
                        onChange={e => setEditActionForm(f => ({...f, heures: e.target.value}))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <textarea required rows={4} value={editActionForm.description}
                      onChange={e => setEditActionForm(f => ({...f, description: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setEditingAction(null)}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Annuler</button>
                    <button type="submit" disabled={savingEditAction}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                      {savingEditAction ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Actions list */}
          {(() => {
            const activeActions = actions.filter(a => !a.archived);
            const archivedActions = actions.filter(a => a.archived);
            return (
              <>
                {activeActions.length === 0 && archivedActions.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-500">Aucune action enregistrée pour ce dossier.</p>
                ) : (
                  <div className="space-y-3">
                    {activeActions.map((action) => (
                      <div key={action.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                {ACTION_TYPE_LABELS[action.type] ?? action.type}
                              </span>
                              {action.heures > 0 && <span className="text-xs text-gray-500">{action.heures}h</span>}
                              <span className="text-xs text-gray-400 ml-auto">{formatDateTime(action.createdAt)}</span>
                            </div>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{action.description}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {isOwner && (
                              <>
                                <button onClick={() => { setEditingAction(action); setEditActionForm({ type: action.type, description: action.description, heures: String(action.heures || ''), montant: String(action.montant || '') }); }}
                                  title="Modifier" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition">
                                  ✏️
                                </button>
                                <button onClick={() => handleToggleArchive(action)} title="Archiver"
                                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition text-sm">
                                  📦
                                </button>
                                <button onClick={() => handleDeleteAction(action.id)} title="Supprimer"
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => toggleVisibility('actions', action.id, 'visibleClient', action.visibleClient ?? false)}
                                  title={action.visibleClient ? 'Visible par le client' : 'Masqué au client'}
                                  className={`p-1.5 rounded transition flex items-center gap-1 text-xs font-medium ${action.visibleClient ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}>
                                  {action.visibleClient ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                  <span className="hidden sm:inline text-xs">C</span>
                                </button>
                                <button onClick={() => toggleVisibility('actions', action.id, 'visibleAssocies', action.visibleAssocies ?? true)}
                                  title={action.visibleAssocies !== false ? 'Visible par les associés' : 'Masqué aux associés'}
                                  className={`p-1.5 rounded transition flex items-center gap-1 text-xs font-medium ${action.visibleAssocies !== false ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}>
                                  {action.visibleAssocies !== false ? <Users className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                  <span className="hidden sm:inline text-xs">A</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {archivedActions.length > 0 && (
                  <div className="mt-4">
                    <button onClick={() => setShowArchived(v => !v)}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
                      📦 {archivedActions.length} action{archivedActions.length > 1 ? 's' : ''} archivée{archivedActions.length > 1 ? 's' : ''}
                      <span className="text-xs">{showArchived ? '▲' : '▼'}</span>
                    </button>
                    {showArchived && (
                      <div className="mt-2 space-y-2">
                        {archivedActions.map(action => (
                          <div key={action.id} className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 opacity-70">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                                    {ACTION_TYPE_LABELS[action.type] ?? action.type}
                                  </span>
                                  <span className="text-xs text-amber-600 font-medium">Archivée</span>
                                  <span className="text-xs text-gray-400 ml-auto">{formatDateTime(action.createdAt)}</span>
                                </div>
                                <p className="text-sm text-gray-500 whitespace-pre-wrap">{action.description}</p>
                              </div>
                              {isOwner && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => handleToggleArchive(action)} title="Désarchiver"
                                    className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition text-sm">
                                    ↩️
                                  </button>
                                  <button onClick={() => handleDeleteAction(action.id)} title="Supprimer"
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Upload */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-1">Ajouter un document</h2>
            {isOwner && (
              <p className="text-xs text-gray-400 mb-4">
                <Eye className="w-3 h-3 inline mr-0.5 text-green-500" />C = visible client ·{' '}
                <Users className="w-3 h-3 inline mr-0.5 text-blue-500" />A = visible associés ·{' '}
                Gris = masqué
              </p>
            )}
            <DocumentUpload
              dossierId={id}
              onUploadSuccess={handleDocumentUploaded}
              onUploadError={(err) => console.error('Upload error:', err)}
            />
          </div>

          {/* Documents list */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">
              Documents ({documents.length})
            </h2>
            {documents.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                Aucun document dans ce dossier.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 flex-1 min-w-0"
                    >
                      <span className="text-2xl shrink-0">{docIcon(doc.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{doc.nom}</p>
                        <p className="text-xs text-gray-400">
                          {formatBytes(doc.taille)} · {formatDate(doc.uploadedAt)}
                          {doc.uploadedByClient && <span className="ml-1 text-blue-500">· Client</span>}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-blue-600">↗</span>
                    </a>
                    {isOwner && (
                      <div className="flex items-center gap-0.5 pr-1">
                        <button
                          onClick={() => toggleVisibility('documents', doc.id, 'visibleClient', doc.visibleClient ?? false)}
                          title={doc.visibleClient ? 'Visible par le client (cliquer pour masquer)' : 'Masqué au client (cliquer pour partager)'}
                          className={`p-1.5 rounded transition flex items-center gap-1 text-xs font-medium ${doc.visibleClient ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}
                        >
                          {doc.visibleClient ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">C</span>
                        </button>
                        <button
                          onClick={() => toggleVisibility('documents', doc.id, 'visibleAssocies', doc.visibleAssocies ?? true)}
                          title={doc.visibleAssocies !== false ? 'Visible par les associés (cliquer pour masquer)' : 'Masqué aux associés (cliquer pour partager)'}
                          className={`p-1.5 rounded transition flex items-center gap-1 text-xs font-medium ${doc.visibleAssocies !== false ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}
                        >
                          {doc.visibleAssocies !== false ? <Users className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">A</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.storagePath ?? '')}
                          title="Supprimer ce document"
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Associés tab */}
      {activeTab === 'associes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-semibold text-gray-900 mb-1">Avocats associés</h2>
                <p className="text-sm text-gray-400">Invitez un confrère par son adresse email. Il pourra consulter le dossier et y ajouter des documents et actions.</p>
              </div>
              {isOwner && (
                <button
                  onClick={async () => {
                    const newVal = !(dossier?.associesVisibleClient ?? true);
                    const res = await fetch(`/api/dossiers/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ associesVisibleClient: newVal }),
                    });
                    if (res.ok) setDossier(prev => prev ? { ...prev, associesVisibleClient: newVal } : prev);
                  }}
                  title={(dossier?.associesVisibleClient ?? true) ? "Masquer les associés au client" : "Montrer les associés au client"}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition ${(dossier?.associesVisibleClient ?? true) ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100' : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                >
                  {(dossier?.associesVisibleClient ?? true) ? <><span>👁</span> Visibles client</> : <><span>🙈</span> Masqués client</>}
                </button>
              )}
            </div>

            {/* Add associé by email — owner only */}
            {isOwner && (
              <>
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={selectedAssocieId}
                    onChange={e => { setSelectedAssocieId(e.target.value); setAssocieError(''); setInviteSuccess(''); setNotFoundEmail(''); }}
                    onKeyDown={e => e.key === 'Enter' && !addingAssocie && selectedAssocieId && document.getElementById('btn-add-associe')?.click()}
                    placeholder="email@confrere.com"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    id="btn-add-associe"
                    disabled={!selectedAssocieId || addingAssocie}
                    onClick={async () => {
                      const emailInput = selectedAssocieId.trim();
                      if (!emailInput) return;
                      setAddingAssocie(true); setAssocieError(''); setInviteSuccess(''); setNotFoundEmail('');
                      const res = await fetch(`/api/dossiers/${id}/associes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: emailInput }),
                      });
                      setAddingAssocie(false);
                      if (res.ok) {
                        const added = await res.json();
                        setAssocies(prev => [...prev, added]);
                        setSelectedAssocieId('');
                      } else {
                        const d = await res.json();
                        const msg = d.error || 'Erreur';
                        setAssocieError(msg);
                        if (msg.startsWith('Aucun compte trouvé')) {
                          setNotFoundEmail(emailInput);
                        }
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition"
                  >
                    {addingAssocie ? 'Ajout…' : 'Ajouter'}
                  </button>
                </div>

                {/* Error + invite suggestion when no account found */}
                {associeError && (
                  <div className="mb-4 space-y-2">
                    <p className="text-sm text-red-600">{associeError}</p>
                    {notFoundEmail && (
                      <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                        <span className="text-sm text-amber-800 flex-1">
                          Ce confrère n'a pas encore de compte. Vous pouvez envoyer une invitation : il sera automatiquement ajouté à ce dossier dès sa première connexion.
                        </span>
                        <button
                          onClick={async () => {
                            setAddingAssocie(true); setAssocieError('');
                            const res = await fetch(`/api/dossiers/${id}/invitations`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: notFoundEmail }),
                            });
                            setAddingAssocie(false);
                            if (res.ok) {
                              const data = await res.json();
                              if (data.type === 'added') {
                                setAssocies(prev => [...prev, { id: data.id, displayName: data.displayName, email: data.email }]);
                              } else {
                                setPendingInvitations(prev => [...prev, { id: data.invitationId ?? Date.now().toString(), email: notFoundEmail, createdAt: new Date().toISOString() }]);
                                setInviteSuccess('Invitation enregistrée pour ' + notFoundEmail);
                              }
                              setNotFoundEmail('');
                              setSelectedAssocieId('');
                            } else {
                              const d = await res.json();
                              setAssocieError(d.error || "Erreur lors de l'invitation");
                            }
                          }}
                          disabled={addingAssocie}
                          className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition"
                        >
                          {addingAssocie ? 'Envoi…' : "Envoyer l'invitation"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {inviteSuccess && (
                  <p className="text-sm text-green-600 mb-4">✓ {inviteSuccess}</p>
                )}
              </>
            )}

            {/* Associates list */}
            {associes.length === 0 && pendingInvitations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucun avocat associé pour ce dossier</p>
            ) : (
              <div className="space-y-2">
                {associes.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.displayName}</p>
                      <p className="text-xs text-gray-400">{a.email}</p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Retirer ${a.displayName} (${a.email}) de ce dossier ?`)) return;
                          const res = await fetch(`/api/dossiers/${id}/associes`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ avocatId: a.id }),
                          });
                          if (res.ok) setAssocies(prev => prev.filter(s => s.id !== a.id));
                        }}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                ))}
                {pendingInvitations.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed border-amber-200 bg-amber-50">
                    <div>
                      <p className="text-sm font-medium text-amber-800">{inv.email}</p>
                      <p className="text-xs text-amber-600">Invitation en attente · Sera ajouté dès sa première connexion</p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Annuler l'invitation pour ${inv.email} ?`)) return;
                          const res = await fetch(`/api/dossiers/${id}/invitations`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ invitationId: inv.id }),
                          });
                          if (res.ok) setPendingInvitations(prev => prev.filter(i => i.id !== inv.id));
                        }}
                        className="text-xs text-amber-600 hover:text-amber-800 px-2 py-1 rounded hover:bg-amber-100 transition"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
