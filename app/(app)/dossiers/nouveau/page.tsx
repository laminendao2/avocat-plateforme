'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { value: 'contentieux', label: 'Contentieux' },
  { value: 'creation_entreprise', label: 'Création Entreprise' },
  { value: 'conseil_rh', label: 'Conseil Juridique RH' },
  { value: 'foncier', label: 'Foncier / Administratif' },
  { value: 'autre', label: 'Autre' },
];

export default function NouveauDossier() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState({
    client_id: '', categorie: 'contentieux', objet: '', description: '',
    statut: 'en_cours', priorite: 'normale', date_echeance: '',
    honoraires_convenus: '', partie_adverse: '', conseil_adverse: '',
    juridiction: '', numero_role: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients || []));
  }, []);

  const field = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { setError('Veuillez sélectionner un client'); return; }
    setSaving(true);
    const payload = {
      clientId: form.client_id,
      titre: form.objet,
      objet: form.objet,
      categorie: form.categorie,
      description: form.description,
      priorite: form.priorite,
      dateEcheance: form.date_echeance,
      montantHonoraires: form.honoraires_convenus ? Number(form.honoraires_convenus) : 0,
    };
    const res = await fetch('/api/dossiers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
      const data = await res.json();
      router.push(`/dossiers/${data.id}`);
    } else {
      const errData = await res.json().catch(() => ({}));
      setError(errData.error || 'Erreur lors de la création');
      setSaving(false);
    }
  }

  const isContentieux = form.categorie === 'contentieux';

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dossiers" className="text-gray-400 hover:text-gray-700 transition"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau dossier</h1>
          <p className="text-gray-500 text-sm">Créer un nouveau dossier client</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-3">Informations générales</h2>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Client *</label>
            <select required value={form.client_id} onChange={e => field('client_id', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">— Sélectionner un client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.type_personne === 'morale' ? c.raison_sociale : `${c.nom} ${c.prenom || ''}`} ({c.reference})
                </option>
              ))}
            </select>
            <Link href="/clients" className="text-xs text-blue-600 hover:underline mt-1 inline-block">+ Créer un client d'abord</Link>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Catégorie *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <label key={c.value} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition text-sm ${form.categorie === c.value ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <input type="radio" name="categorie" value={c.value} checked={form.categorie === c.value} onChange={() => field('categorie', c.value)} className="sr-only" />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Objet du dossier *</label>
            <input required value={form.objet} onChange={e => field('objet', e.target.value)} placeholder="Ex: Création SARL Diallo & Associés" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => field('description', e.target.value)} rows={3} placeholder="Détails de la mission..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Priorité</label>
              <select value={form.priorite} onChange={e => field('priorite', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Date d'échéance</label>
              <input type="date" value={form.date_echeance} onChange={e => field('date_echeance', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Honoraires convenus (FCFA)</label>
            <input type="number" value={form.honoraires_convenus} onChange={e => field('honoraires_convenus', e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        {isContentieux && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-3">Informations procédurales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Partie adverse</label>
                <input value={form.partie_adverse} onChange={e => field('partie_adverse', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Conseil adverse</label>
                <input value={form.conseil_adverse} onChange={e => field('conseil_adverse', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Juridiction</label>
                <input value={form.juridiction} onChange={e => field('juridiction', e.target.value)} placeholder="Ex: TGI Conakry" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">N° Rôle / Affaire</label>
                <input value={form.numero_role} onChange={e => field('numero_role', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/dossiers" className="flex-1 text-center border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition">Annuler</Link>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:bg-blue-400">
            <Save className="w-4 h-4" /> {saving ? 'Création...' : 'Créer le dossier'}
          </button>
        </div>
      </form>
    </div>
  );
}
