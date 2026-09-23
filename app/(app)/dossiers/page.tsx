'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FolderOpen, Plus, Search, Filter, Gavel, Building2, UserCheck, MapPin } from 'lucide-react';

const CATEGORIES = [
  { value: '', label: 'Toutes', icon: FolderOpen },
  { value: 'contentieux', label: 'Contentieux', icon: Gavel, color: 'text-red-600 bg-red-50' },
  { value: 'creation_entreprise', label: 'Création Entreprise', icon: Building2, color: 'text-blue-600 bg-blue-50' },
  { value: 'conseil_rh', label: 'Conseil RH', icon: UserCheck, color: 'text-purple-600 bg-purple-50' },
  { value: 'foncier', label: 'Foncier', icon: MapPin, color: 'text-green-600 bg-green-50' },
];

const STATUTS = [
  { value: '', label: 'Tous statuts' },
  { value: 'en_cours', label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  { value: 'en_attente', label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'cloture', label: 'Clôturé', color: 'bg-green-100 text-green-700' },
];

const PRIORITES: Record<string, string> = {
  haute: 'bg-red-100 text-red-700',
  normale: 'bg-gray-100 text-gray-600',
  basse: 'bg-green-100 text-green-700',
};

function DossiersContent() {
  const searchParams = useSearchParams();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState(searchParams.get('cat') || '');
  const [statut, setStatut] = useState(searchParams.get('statut') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ search, categorie: cat, statut });
      fetch(`/api/dossiers?${params}`).then(r => r.json()).then(d => { setDossiers(d.dossiers || []); setLoading(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [search, cat, statut]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dossiers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{dossiers.length} dossier(s)</p>
        </div>
        <Link href="/dossiers/nouveau" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 font-medium text-sm">
          <Plus className="w-4 h-4" /> Nouveau dossier
        </Link>
      </div>

      {/* Filtres catégorie */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map(({ value, label, icon: Icon, color }) => (
          <button
            key={value}
            onClick={() => setCat(value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
              cat === value
                ? 'bg-blue-600 text-white border-blue-600'
                : `border-gray-200 text-gray-600 hover:border-blue-300 ${color || ''}`
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Search + statut */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
        <select value={statut} onChange={e => setStatut(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
          {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
      ) : dossiers.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucun dossier trouvé</p>
          <Link href="/dossiers/nouveau" className="mt-4 inline-block text-blue-600 hover:underline text-sm">Créer un dossier</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Référence', 'Client', 'Catégorie', 'Objet', 'Échéance', 'Priorité', 'Statut'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dossiers.map((d: any) => {
                  const catInfo = CATEGORIES.find(c => c.value === d.categorie);
                  const statutInfo = STATUTS.find(s => s.value === d.statut);
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <Link href={`/dossiers/${d.id}`} className="text-blue-600 font-mono font-medium hover:underline">{d.reference}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {d.clientTypePersonne === 'morale' ? d.clientRaisonSociale : `${d.clientNom} ${d.clientPrenom || ''}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${catInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                          {catInfo?.label || d.categorie}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{d.objet || d.titre}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {d.dateEcheance ? new Date(d.dateEcheance).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITES[d.priorite] || ''}`}>{d.priorite}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statutInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                          {statutInfo?.label || d.statut}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DossiersPage() {
  return <Suspense><DossiersContent /></Suspense>;
}
