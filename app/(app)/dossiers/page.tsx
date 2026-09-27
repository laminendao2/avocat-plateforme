'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, Eye, Pencil, Trash2, Folder, Filter } from 'lucide-react';

const CAT_CONFIG: Record<string, { label: string; color: string }> = {
  contentieux: { label: 'Contentieux', color: 'bg-red-100 text-red-700' },
  creation_entreprise: { label: 'Droit des Sociétés', color: 'bg-blue-100 text-blue-700' },
  conseil_rh: { label: 'Conseil RH', color: 'bg-purple-100 text-purple-700' },
  foncier: { label: 'Droit Immobilier', color: 'bg-teal-100 text-teal-700' },
  propriete_intellectuelle: { label: 'Propriété Intellectuelle', color: 'bg-indigo-100 text-indigo-700' },
  droit_fiscal: { label: 'Droit Fiscal', color: 'bg-orange-100 text-orange-700' },
  droit_famille: { label: 'Droit de la Famille', color: 'bg-pink-100 text-pink-700' },
  autre: { label: 'Autre', color: 'bg-gray-100 text-gray-600' },
};

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  en_cours: { label: 'Ouvert', color: 'bg-green-100 text-green-700' },
  en_attente: { label: 'En Attente', color: 'bg-amber-100 text-amber-700' },
  cloture: { label: 'Clôturé', color: 'bg-gray-200 text-gray-600' },
};

const PAGE_SIZE = 10;

function DossiersContent() {
  const searchParams = useSearchParams();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState(searchParams.get('cat') || '');
  const [statut, setStatut] = useState(searchParams.get('statut') || '');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ search, categorie: cat, statut });
      fetch(`/api/dossiers?${params}`).then(r => r.json()).then(d => {
        setDossiers(d.dossiers || []);
        setLoading(false);
        setPage(1);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [search, cat, statut]);

  const totalPages = Math.max(1, Math.ceil(dossiers.length / PAGE_SIZE));
  const pageDossiers = dossiers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function clientName(d: any) {
    if (d.clientTypePersonne === 'morale') return d.clientRaisonSociale || '—';
    return [d.clientNom, d.clientPrenom].filter(Boolean).join(' ') || '—';
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0C1B3E' }}>Tous les Dossiers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dossiers.length} dossier{dossiers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dossiers/nouveau"
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-md hover:opacity-90 transition"
            style={{ background: '#0C1B3E' }}>
            <Plus className="w-4 h-4" /> Nouveau Dossier
          </Link>
          <button className="flex items-center gap-2 border border-gray-200 bg-white text-gray-600 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">
            Exporter
          </button>
          <button className="flex items-center gap-2 border border-gray-200 bg-white text-gray-600 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">
            <Filter className="w-4 h-4" /> Filtres
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {(cat || statut) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {statut && (
            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">
              Statut: {STATUT_CONFIG[statut]?.label || statut}
              <button onClick={() => setStatut('')} className="hover:text-blue-900">✕</button>
            </span>
          )}
          {cat && (
            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">
              Catégorie: {CAT_CONFIG[cat]?.label || cat}
              <button onClick={() => setCat('')} className="hover:text-blue-900">✕</button>
            </span>
          )}
        </div>
      )}

      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-50">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une référence, un client..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={statut} onChange={e => { setStatut(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Tous les statuts</option>
            {Object.entries(STATUT_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
          <select value={cat} onChange={e => { setCat(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Toutes catégories</option>
            {Object.entries(CAT_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
        ) : pageDossiers.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">Aucun dossier trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Référence', 'Client', 'Catégorie', 'Objet', 'Statut', "Date d'ouverture", 'Avocat Responsable', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageDossiers.map((d: any) => {
                  const catInfo = CAT_CONFIG[d.categorie] || { label: d.categorie, color: 'bg-gray-100 text-gray-600' };
                  const stInfo = STATUT_CONFIG[d.statut] || { label: d.statut, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={d.id} className="hover:bg-blue-50/20 transition">
                      <td className="px-4 py-3">
                        <Link href={`/dossiers/${d.id}`} className="font-mono text-blue-600 font-medium hover:underline">{d.reference}</Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{clientName(d)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${catInfo.color}`}>{catInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{d.objet || d.titre || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${stInfo.color}`}>{stInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {d.avocatNom || 'Maître'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/dossiers/${d.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Voir">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link href={`/dossiers/${d.id}`} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Modifier">
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <Link href={`/dossiers/${d.id}`} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </Link>
                          <Link href={`/dossiers/${d.id}`} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Documents">
                            <Folder className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && dossiers.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 text-xs text-gray-500">
            <span>Affichage {Math.min((page-1)*PAGE_SIZE+1, dossiers.length)}-{Math.min(page*PAGE_SIZE, dossiers.length)} sur {dossiers.length} dossiers</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition">
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg font-medium transition ${p === page ? 'text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  style={p === page ? { background: '#0C1B3E' } : {}}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition">
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DossiersPage() {
  return <Suspense><DossiersContent /></Suspense>;
}
