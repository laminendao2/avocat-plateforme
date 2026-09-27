'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, Pencil, Trash2, Plus, FileText, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';

const STATUT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  brouillon:  { label: 'Brouillon',  bg: 'bg-gray-100',   text: 'text-gray-700' },
  envoyee:    { label: 'Envoyée',    bg: 'bg-blue-100',   text: 'text-blue-700' },
  payee:      { label: 'Payée',      bg: 'bg-green-100',  text: 'text-green-700' },
  impayee:    { label: 'Impayée',    bg: 'bg-red-100',    text: 'text-red-700' },
};

function StatutBadge({ statut }: { statut: string }) {
  const cfg = STATUT_CONFIG[statut] || { label: statut, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMontant(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

const PAGE_SIZE = 10;

function FacturesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [factures, setFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/factures')
      .then(r => r.json())
      .then(d => { setFactures(d.factures || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, ref: string) {
    if (!confirm(`Supprimer la facture ${ref} ?`)) return;
    setDeleting(id);
    await fetch(`/api/factures/${id}`, { method: 'DELETE' });
    setFactures(prev => prev.filter(f => f.id !== id));
    setDeleting(null);
  }

  const filtered = factures.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q || f.reference?.toLowerCase().includes(q) || f.clientNom?.toLowerCase().includes(q) || f.dossierTitre?.toLowerCase().includes(q);
    const matchStatut = !statutFilter || f.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalMontant = filtered.reduce((s, f) => s + (f.montantTotal || 0), 0);
  const totalPayees = filtered.filter(f => f.statut === 'payee').reduce((s, f) => s + (f.montantTotal || 0), 0);
  const totalImpayees = filtered.filter(f => f.statut === 'impayee' || f.statut === 'envoyee').reduce((s, f) => s + (f.montantTotal || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF5A]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0C1B3E]">Facturation</h1>
          <p className="text-sm text-gray-500 mt-0.5">{factures.length} facture{factures.length !== 1 ? 's' : ''} au total</p>
        </div>
        <button
          onClick={() => router.push('/factures/nouvelle')}
          className="flex items-center gap-2 bg-[#0C1B3E] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1a2d5a] transition-colors shadow"
        >
          <Plus className="h-4 w-4" />
          Nouvelle facture
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total</p>
          <p className="text-xl font-bold text-[#0C1B3E] mt-1">{fmtMontant(totalMontant)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Encaissé</p>
          <p className="text-xl font-bold text-green-600 mt-1">{fmtMontant(totalPayees)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">En attente</p>
          <p className="text-xl font-bold text-red-500 mt-1">{fmtMontant(totalImpayees)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher (référence, client, dossier)..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1B3E]/20"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statutFilter}
              onChange={e => { setStatutFilter(e.target.value); setPage(1); }}
              className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1B3E]/20 appearance-none bg-white"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Aucune facture trouvée</p>
            <p className="text-sm mt-1">Créez votre première facture</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['RÉFÉRENCE', 'CLIENT', 'DOSSIER', 'MONTANT', 'STATUT', 'ÉMISSION', 'ÉCHÉANCE', 'ACTIONS'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageData.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-[#0C1B3E]">{f.reference}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{f.clientNom || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">{f.dossierTitre || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#0C1B3E]">{fmtMontant(f.montantTotal)}</td>
                    <td className="px-4 py-3"><StatutBadge statut={f.statut} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmt(f.dateEmission)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmt(f.dateEcheance)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/factures/${f.id}`)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/factures/${f.id}?edit=1`)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(f.id, f.reference)}
                          disabled={deleting === f.id}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium ${p === page ? 'bg-[#0C1B3E] text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function FacturesPage() {
  return <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF5A]" /></div>}><FacturesContent /></Suspense>;
}
