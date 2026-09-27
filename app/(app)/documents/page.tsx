'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Upload, Eye, Download, Share2, Trash2, Search } from 'lucide-react';

const TYPE_CONFIG: Record<string, { label: string; bg: string }> = {
  pdf: { label: 'PDF', bg: 'bg-red-500' },
  'application/pdf': { label: 'PDF', bg: 'bg-red-500' },
  docx: { label: 'Word', bg: 'bg-blue-600' },
  doc: { label: 'Word', bg: 'bg-blue-600' },
  'application/msword': { label: 'Word', bg: 'bg-blue-600' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'Word', bg: 'bg-blue-600' },
  jpg: { label: 'Image', bg: 'bg-green-500' },
  jpeg: { label: 'Image', bg: 'bg-green-500' },
  png: { label: 'Image', bg: 'bg-green-500' },
  gif: { label: 'Image', bg: 'bg-green-500' },
  webp: { label: 'Image', bg: 'bg-green-500' },
  svg: { label: 'Image', bg: 'bg-green-500' },
  'image/png': { label: 'Image', bg: 'bg-green-500' },
  'image/jpeg': { label: 'Image', bg: 'bg-green-500' },
  'image/gif': { label: 'Image', bg: 'bg-green-500' },
  'image/webp': { label: 'Image', bg: 'bg-green-500' },
  scan: { label: 'Scan', bg: 'bg-gray-500' },
  xlsx: { label: 'Excel', bg: 'bg-emerald-600' },
  xls: { label: 'Excel', bg: 'bg-emerald-600' },
};

function DocBadge({ type }: { type: string }) {
  const key = (type || '').toLowerCase().trim();
  const cfg = TYPE_CONFIG[key]
    || TYPE_CONFIG[key.split('/').pop() || '']
    || { label: (key.split('/').pop() || key).toUpperCase() || 'Fichier', bg: 'bg-gray-500' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-white ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

const PAGE_SIZE = 10;

function DocumentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const p = new URLSearchParams({ search, type: typeFilter });
      fetch(`/api/documents?${p}`).then(r => r.json()).then(d => {
        setDocs(d.documents || d || []);
        setLoading(false);
        setPage(1);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(docs.length / PAGE_SIZE));
  const pageDocs = docs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0C1B3E' }}>Gestion des Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-md hover:opacity-90 transition"
          style={{ background: '#0C1B3E' }}>
          <Upload className="w-4 h-4" /> Téléverser un document
        </button>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-50">
          <span className="text-sm text-gray-500 font-medium">Filtrer par :</span>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un document, un client..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            {[['', 'Tous les types'], ['pdf', 'PDF'], ['docx', 'Word'], ['jpg', 'Scans']].map(([v, l]) => (
              <button key={v} onClick={() => { setTypeFilter(v); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                  typeFilter === v ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                {v === 'pdf' && <span className="w-4 h-4 bg-red-500 rounded text-white text-[9px] flex items-center justify-center font-bold">P</span>}
                {v === 'docx' && <span className="w-4 h-4 bg-blue-500 rounded text-white text-[9px] flex items-center justify-center font-bold">W</span>}
                {v === 'jpg' && <span className="w-4 h-4 bg-gray-500 rounded text-white text-[9px] flex items-center justify-center font-bold">S</span>}
                {l}
              </button>
            ))}
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option>Dossier : Tous</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
        ) : pageDocs.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            Aucun document trouvé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Nom du Document', 'Type de Fichier', 'Dossier Associé', 'Taille', 'Date de Modification', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageDocs.map((doc: any) => {
                  const ext = (doc.mimeType || doc.type || doc.contentType || doc.nom?.split('.').pop() || '').toLowerCase();
                  return (
                    <tr key={doc.id} className="hover:bg-blue-50/20 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-800">{doc.nom || doc.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><DocBadge type={ext} /></td>
                      <td className="px-5 py-3">
                        {doc.dossierId ? (
                          <Link href={`/dossiers/${doc.dossierId}`} className="text-blue-600 font-mono font-medium hover:underline text-xs">
                            {doc.dossierRef || doc.dossierId}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{formatSize(doc.size || doc.taille)}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {doc.uploadedAt || doc.updatedAt || doc.createdAt
                          ? new Date(doc.uploadedAt || doc.updatedAt || doc.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <a href={doc.url} target="_blank" rel="noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Voir">
                            <Eye className="w-4 h-4" />
                          </a>
                          <a href={doc.url} download
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Télécharger">
                            <Download className="w-4 h-4" />
                          </a>
                          <button className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition" title="Partager">
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
        {!loading && docs.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 text-xs text-gray-500">
            <span>{Math.min((page-1)*PAGE_SIZE+1, docs.length)}-{Math.min(page*PAGE_SIZE, docs.length)} sur {docs.length} documents</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">Précédent</button>
              {Array.from({length: totalPages}, (_, i) => i+1).filter(p => Math.abs(p-page) <= 2).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg font-medium transition ${p === page ? 'text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  style={p === page ? { background: '#0C1B3E' } : {}}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">Suivant</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return <Suspense><DocumentsContent /></Suspense>;
}
