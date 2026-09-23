'use client';
import { useState, useEffect, useMemo } from 'react';
import { FileText, Search, Download, ExternalLink, FileImage, File, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Doc {
  id: string;
  dossierId: string;
  dossierRef: string;
  clientNom: string;
  clientPrenom: string;
  clientTelephone: string;
  nom: string;
  nomOriginal?: string;
  type: string;
  taille: number;
  url: string;
  uploadedAt: string | null;
  visibleClient?: boolean;
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <FileImage className="w-5 h-5 text-blue-400" />;
  if (type === 'application/pdf') return <FileText className="w-5 h-5 text-red-400" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetch('/api/documents')
      .then(r => r.json())
      .then(data => setDocuments(data.documents ?? []))
      .finally(() => setLoading(false));
  }, []);

  const types = useMemo(() => {
    const set = new Set(documents.map(d => {
      if (d.type?.startsWith('image/')) return 'image';
      if (d.type === 'application/pdf') return 'pdf';
      return 'autre';
    }));
    return [...set];
  }, [documents]);

  const filtered = useMemo(() => {
    return documents.filter(d => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        d.nom?.toLowerCase().includes(q) ||
        d.dossierRef?.toLowerCase().includes(q) ||
        d.clientNom?.toLowerCase().includes(q) ||
        d.clientPrenom?.toLowerCase().includes(q) ||
        d.clientTelephone?.includes(q);
      const docType = d.type?.startsWith('image/') ? 'image' : d.type === 'application/pdf' ? 'pdf' : 'autre';
      const matchType = !typeFilter || docType === typeFilter;
      return matchSearch && matchType;
    });
  }, [documents, search, typeFilter]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500 mt-1">Tous les documents de vos dossiers</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Nom, prénom, téléphone, référence dossier…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les types</option>
          {types.includes('pdf') && <option value="pdf">PDF</option>}
          {types.includes('image') && <option value="image">Images</option>}
          {types.includes('autre') && <option value="autre">Autres</option>}
        </select>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">
            {documents.length === 0 ? 'Aucun document pour le moment' : 'Aucun résultat'}
          </p>
          {documents.length === 0 && (
            <p className="text-gray-300 text-sm mt-1">Ajoutez des documents depuis un dossier</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 items-center px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span></span>
            <span>Nom</span>
            <span className="text-right">Dossier</span>
            <span className="text-right">Taille</span>
            <span className="text-right">Date</span>
          </div>
          {filtered.map((doc, i) => (
            <div
              key={doc.id}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 items-center px-4 py-3 hover:bg-gray-50 transition ${i !== 0 ? 'border-t border-gray-100' : ''}`}
            >
              <div className="flex-shrink-0">{fileIcon(doc.type)}</div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.nom || doc.nomOriginal || 'Sans nom'}</p>
                {(doc.clientNom || doc.clientPrenom) && <p className="text-xs text-gray-400 truncate">{[doc.clientPrenom, doc.clientNom].filter(Boolean).join(' ')}</p>}
              </div>
              <Link
                href={`/dossiers/${doc.dossierId}`}
                className="text-xs text-blue-600 hover:underline whitespace-nowrap"
              >
                {doc.dossierRef}
              </Link>
              <span className="text-xs text-gray-400 whitespace-nowrap text-right">
                {formatSize(doc.taille ?? 0)}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(doc.uploadedAt)}</span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-600 transition"
                  title="Ouvrir"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href={doc.url}
                  download
                  className="text-gray-400 hover:text-blue-600 transition"
                  title="Télécharger"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            {filtered.length} document{filtered.length > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
