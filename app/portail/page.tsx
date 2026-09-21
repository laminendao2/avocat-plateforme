'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const STATUT_LABELS: Record<string, string> = { ouvert: 'Ouvert', en_cours: 'En cours', en_attente: 'En attente', cloture: 'Clôturé' };
const STATUT_COLORS: Record<string, string> = { ouvert: 'bg-blue-100 text-blue-700', en_cours: 'bg-yellow-100 text-yellow-800', en_attente: 'bg-gray-100 text-gray-700', cloture: 'bg-green-100 text-green-700' };
const CAT_LABELS: Record<string, string> = { creation_entreprise: "Création d'entreprise", contentieux: 'Contentieux', conseil_rh: 'Conseil RH', foncier: 'Foncier' };

export default function PortailHomePage() {
  const router = useRouter();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portail/dossiers').then(r => {
      if (r.status === 401) { router.push('/portail/login'); return null; }
      return r.json();
    }).then(d => { if (d) { setDossiers(d.dossiers || []); setLoading(false); } });
  }, [router]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Mes dossiers</h1>
      <p className="text-gray-500 text-sm mb-6">{dossiers.length} dossier(s) en cours</p>
      {dossiers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucun dossier pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dossiers.map(d => (
            <button key={d.id} onClick={() => router.push(`/portail/dossiers/${d.id}`)}
              className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">{d.reference}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[d.statut] ?? 'bg-gray-100 text-gray-600'}`}>{STATUT_LABELS[d.statut] ?? d.statut}</span>
                  </div>
                  <p className="font-semibold text-gray-800">{d.titre || d.objet}</p>
                  {d.categorie && <p className="text-sm text-gray-500 mt-0.5">{CAT_LABELS[d.categorie] ?? d.categorie}</p>}
                </div>
                {d.dateEcheance && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-lg flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(d.dateEcheance).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
              {d.montantHonoraires > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-4 text-sm">
                  <span className="text-gray-500">Honoraires : <span className="font-medium text-gray-800">{d.montantHonoraires.toLocaleString('fr-FR')} FCFA</span></span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
