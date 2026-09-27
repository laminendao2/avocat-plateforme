'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, Pencil, Save, X, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';

const STATUT_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  brouillon: { label: 'Brouillon', bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText },
  envoyee:   { label: 'Envoyée',   bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  payee:     { label: 'Payée',     bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  impayee:   { label: 'Impayée',  bg: 'bg-red-100',   text: 'text-red-700', icon: AlertCircle },
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtMontant(n: number | null) {
  if (n == null) return '0,00 €';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function FactureDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [facture, setFacture] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get('edit') === '1');
  const [statut, setStatut] = useState('');
  const [saving, setSaving] = useState(false);
  const [cabinet, setCabinet] = useState<any>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/factures/${params.id}`).then(r => r.json()),
      fetch('/api/parametres/cabinet').then(r => r.json()).catch(() => ({})),
    ]).then(([fd, cd]) => {
      setFacture(fd.facture);
      setStatut(fd.facture?.statut || '');
      setCabinet(cd);
      setLoading(false);
    });
  }, [params.id]);

  async function handleUpdateStatut(newStatut: string) {
    setSaving(true);
    await fetch(`/api/factures/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: newStatut }),
    });
    setFacture((prev: any) => ({ ...prev, statut: newStatut }));
    setStatut(newStatut);
    setSaving(false);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF5A]" /></div>;
  if (!facture) return <div className="p-6 text-red-500">Facture introuvable</div>;

  const cfg = STATUT_CONFIG[facture.statut] || STATUT_CONFIG.brouillon;
  const Icon = cfg.icon;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-page { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 40px !important; }
        }
      `}</style>

      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between no-print">
          <button onClick={() => router.push('/factures')} className="flex items-center gap-2 text-gray-600 hover:text-[#0C1B3E] transition-colors text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Retour aux factures
          </button>
          <div className="flex items-center gap-2">
            <select
              value={statut}
              onChange={e => handleUpdateStatut(e.target.value)}
              disabled={saving}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1B3E]/20"
            >
              {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Printer className="h-4 w-4" /> Imprimer / PDF
            </button>
          </div>
        </div>

        {/* Invoice document */}
        <div className="print-page bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              {cabinet.cabinetLogoUrl && (
                <img src={cabinet.cabinetLogoUrl} alt="Logo" className="h-12 mb-2 object-contain" />
              )}
              <h2 className="text-xl font-bold text-[#0C1B3E]">{cabinet.cabinetNom || 'Cabinet Juridique'}</h2>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-[#0C1B3E]">FACTURE</h1>
              <p className="font-mono text-lg font-semibold text-[#D4AF5A] mt-1">{facture.reference}</p>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-2 ${cfg.bg} ${cfg.text}`}>
                <Icon className="h-3 w-3" />
                {cfg.label}
              </span>
            </div>
          </div>

          {/* Dates + Client */}
          <div className="grid grid-cols-2 gap-8 border-t border-b border-gray-100 py-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Facturé à</h3>
              <p className="font-semibold text-[#0C1B3E] text-lg">{facture.clientNom || '—'}</p>
              {facture.clientAdresse && <p className="text-sm text-gray-600 mt-1">{facture.clientAdresse}</p>}
              {facture.clientEmail && <p className="text-sm text-gray-600">{facture.clientEmail}</p>}
              {facture.clientTel && <p className="text-sm text-gray-600">{facture.clientTel}</p>}
              {facture.dossierTitre && (
                <p className="text-xs text-gray-500 mt-2">Dossier: <span className="font-medium">{facture.dossierTitre}</span></p>
              )}
            </div>
            <div className="text-right space-y-2">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Date d'émission</p>
                <p className="text-sm font-medium text-[#0C1B3E]">{fmt(facture.dateEmission)}</p>
              </div>
              {facture.dateEcheance && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Date d'échéance</p>
                  <p className="text-sm font-medium text-[#0C1B3E]">{fmt(facture.dateEcheance)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lines */}
          <table className="w-full">
            <thead>
              <tr className="bg-[#0C1B3E] text-white">
                <th className="px-4 py-3 text-left text-sm font-semibold rounded-l-lg">Description</th>
                <th className="px-4 py-3 text-right text-sm font-semibold w-20">Qté</th>
                <th className="px-4 py-3 text-right text-sm font-semibold w-32">Prix unit.</th>
                <th className="px-4 py-3 text-right text-sm font-semibold w-32 rounded-r-lg">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {facture.lignes?.map((l: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800">{l.description}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{l.quantite}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{fmtMontant(l.prixUnitaire)}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-[#0C1B3E]">{fmtMontant(l.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#0C1B3E]">
                <td colSpan={3} className="px-4 pt-4 text-right font-bold text-[#0C1B3E] text-lg">TOTAL HT</td>
                <td className="px-4 pt-4 text-right font-bold text-xl text-[#D4AF5A]">{fmtMontant(facture.montantTotal)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Notes */}
          {facture.notes && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{facture.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
