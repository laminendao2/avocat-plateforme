'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, CreditCard, Download, Upload, Trash2, X, Clock, Users, BookOpen } from 'lucide-react';

const STATUT_LABELS: Record<string,string> = { ouvert:'Ouvert', en_cours:'En cours', en_attente:'En attente', cloture:'Clôturé' };
const STATUT_COLORS: Record<string,string> = { ouvert:'bg-blue-100 text-blue-700', en_cours:'bg-yellow-100 text-yellow-800', en_attente:'bg-gray-100 text-gray-700', cloture:'bg-green-100 text-green-700' };
const CAT_LABELS: Record<string,string> = { creation_entreprise:"Création d'entreprise", contentieux:'Contentieux', conseil_rh:'Conseil RH', foncier:'Foncier' };
const fmt = (iso: string|null) => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';
const money = (n: number) => (n ?? 0).toLocaleString('fr-FR', { style:'currency', currency:'XOF', maximumFractionDigits:0 });

const ALLOWED_TYPES = ['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_MB = 20;
const GRACE_MS = 30 * 60 * 1000;

function canDelete(doc: any): boolean {
  if (!doc.uploadedByClient) return false;
  const uploaded = doc.uploadedAt ? new Date(doc.uploadedAt).getTime() : 0;
  return Date.now() - uploaded < GRACE_MS;
}

function timeLeft(doc: any): string {
  const uploaded = doc.uploadedAt ? new Date(doc.uploadedAt).getTime() : 0;
  const ms = GRACE_MS - (Date.now() - uploaded);
  if (ms <= 0) return '';
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${sec.toString().padStart(2,'0')}`;
}

export default function PortailDossierPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File|null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [timers, setTimers] = useState<Record<string,string>>({});
  const [clientActions, setClientActions] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const r = await fetch(`/api/portail/dossiers/${id}`);
    if (r.status === 401) { router.push('/portail/login'); return; }
    const d = await r.json();
    if (d) setData(d);
    const ar = await fetch(`/api/portail/dossiers/${id}/actions`);
    if (ar.ok) { const ad = await ar.json(); setClientActions(ad.actions || []); }
  };

  useEffect(() => { loadData(); }, [id]);

  // Countdown timers for deletable docs
  useEffect(() => {
    const tick = () => {
      if (!data?.documents) return;
      const next: Record<string,string> = {};
      for (const doc of data.documents) {
        if (doc.uploadedByClient) next[doc.id] = timeLeft(doc);
      }
      setTimers(next);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data]);

  async function handleUpload() {
    if (!selectedFile) return;
    if (!ALLOWED_TYPES.includes(selectedFile.type)) { setUploadError('Type non autorisé. PDF, images ou Word.'); return; }
    if (selectedFile.size > MAX_MB * 1024 * 1024) { setUploadError(`Taille maximale : ${MAX_MB} Mo`); return; }
    setUploading(true);
    setUploadError('');
    const form = new FormData();
    form.append('file', selectedFile);
    form.append('nom', selectedFile.name);
    const res = await fetch(`/api/portail/dossiers/${id}/documents`, { method: 'POST', body: form });
    setUploading(false);
    if (res.ok) {
      setShowUpload(false);
      setSelectedFile(null);
      await loadData();
    } else {
      const d = await res.json();
      setUploadError(d.error || 'Erreur lors du téléversement');
    }
  }

  async function handleDelete(docId: string) {
    setDeletingId(docId);
    const res = await fetch(`/api/portail/dossiers/${id}/documents/${docId}`, { method: 'DELETE' });
    setDeletingId(null);
    if (res.ok) {
      await loadData();
    } else {
      const d = await res.json();
      alert(d.error || 'Impossible de supprimer ce document');
    }
  }

  if (!data) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const totalPaye = (data.paiements || []).reduce((s: number, p: any) => s + (p.montant ?? 0), 0);
  const restant = (data.montantHonoraires ?? 0) - totalPaye;
  const docs: any[] = data.documents || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/portail')} className="text-gray-400 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{data.titre || data.objet}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs text-gray-400">{data.reference}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[data.statut] ?? ''}`}>{STATUT_LABELS[data.statut] ?? data.statut}</span>
          </div>
        </div>
      </div>

      {/* Infos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">Informations</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500">Catégorie</dt><dd>{CAT_LABELS[data.categorie] ?? data.categorie}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Ouvert le</dt><dd>{fmt(data.createdAt)}</dd></div>
          {data.dateEcheance && <div className="flex justify-between"><dt className="text-gray-500">Échéance</dt><dd className="text-orange-600 font-medium">{fmt(data.dateEcheance)}</dd></div>}
          {data.description && <div className="pt-2 border-t border-gray-50"><p className="text-gray-600">{data.description}</p></div>}
        </dl>
      </div>

      {/* Honoraires */}
      {data.montantHonoraires > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4" />Honoraires</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Montant convenu</dt><dd className="font-medium">{money(data.montantHonoraires)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Total versé</dt><dd className="font-medium text-green-700">{money(totalPaye)}</dd></div>
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <dt className="font-medium text-gray-700">Restant dû</dt>
              <dd className={`font-bold ${restant > 0 ? 'text-red-600' : 'text-green-700'}`}>{money(restant)}</dd>
            </div>
          </dl>
          {(data.paiements || []).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Historique des versements</p>
              {data.paiements.map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-gray-500">{fmt(p.date)}{p.note ? ` — ${p.note}` : ''}</span>
                  <span className="font-medium text-green-700">+{money(p.montant)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Équipe */}
      {(data.equipe ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />Votre équipe juridique
          </h2>
          <div className="space-y-2">
            {data.equipe.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {(a.displayName || a.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{a.displayName}</p>
                  <p className="text-xs text-gray-400">{a.role}{a.email ? ` · ${a.email}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Journal partagé */}
      {clientActions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />Journal du dossier
          </h2>
          <div className="space-y-3">
            {clientActions.map((a: any) => (
              <div key={a.id} className="border-l-2 border-blue-200 pl-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    {({'consultation':'Consultation','audience':'Audience','redaction':'Rédaction','correspondance':'Correspondance','recherche':'Recherche','note_interne':'Note','autre':'Autre'} as any)[a.type] ?? a.type}
                  </span>
                  {a.heures > 0 && <span className="text-xs text-gray-400">{a.heures}h</span>}
                  <span className="text-xs text-gray-400 ml-auto">{a.createdAt ? new Date(a.createdAt).toLocaleDateString('fr-FR') : ''}</span>
                </div>
                <p className="text-sm text-gray-700">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4" />Documents ({docs.length})
          </h2>
          <button
            onClick={() => { setShowUpload(!showUpload); setSelectedFile(null); setUploadError(''); }}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {showUpload ? <><X className="w-4 h-4" />Annuler</> : <><Upload className="w-4 h-4" />Ajouter</>}
          </button>
        </div>

        {/* Upload zone */}
        {showUpload && (
          <div className="mb-4 p-4 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50 space-y-3">
            <input ref={fileInputRef} type="file" accept={ALLOWED_TYPES.join(',')} className="hidden"
              onChange={e => { setSelectedFile(e.target.files?.[0] ?? null); setUploadError(''); }} />
            {selectedFile ? (
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-1 truncate">{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2">
                📁 Choisir un fichier (PDF, image, Word — max {MAX_MB} Mo)
              </button>
            )}
            {uploadError && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{uploadError}</p>}
            {selectedFile && (
              <button onClick={handleUpload} disabled={uploading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition">
                {uploading ? 'Téléversement…' : 'Envoyer le document'}
              </button>
            )}
          </div>
        )}

        {docs.length === 0 && !showUpload ? (
          <p className="text-sm text-gray-400 text-center py-6">Aucun document pour ce dossier</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc: any) => {
              const deletable = canDelete(doc);
              const countdown = timers[doc.id];
              return (
                <div key={doc.id} className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:border-gray-200 group">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{doc.nomOriginal || doc.nom}</span>
                    <Download className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 ml-auto" />
                  </a>
                  {deletable && countdown && (
                    <span className="flex items-center gap-1 text-xs text-orange-500 flex-shrink-0">
                      <Clock className="w-3 h-3" />{countdown}
                    </span>
                  )}
                  {deletable && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      title="Supprimer (sous 30 min)"
                      className="flex-shrink-0 p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
