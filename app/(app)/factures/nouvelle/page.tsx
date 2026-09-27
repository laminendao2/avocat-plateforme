'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

interface Ligne {
  description: string;
  quantite: number;
  prixUnitaire: number;
}

export default function NouvelleFacturePage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [filteredDossiers, setFilteredDossiers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientId, setClientId] = useState('');
  const [dossierId, setDossierId] = useState('');
  const [dateEmission, setDateEmission] = useState(new Date().toISOString().slice(0, 10));
  const [dateEcheance, setDateEcheance] = useState('');
  const [statut, setStatut] = useState('brouillon');
  const [notes, setNotes] = useState('');
  const [lignes, setLignes] = useState<Ligne[]>([{ description: 'Honoraires juridiques', quantite: 1, prixUnitaire: 0 }]);

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/dossiers').then(r => r.json()),
    ]).then(([cd, dd]) => {
      setClients(cd.clients || []);
      setDossiers(dd.dossiers || []);
    });
  }, []);

  useEffect(() => {
    if (!clientId) { setFilteredDossiers(dossiers); return; }
    setFilteredDossiers(dossiers.filter((d: any) => d.clientId === clientId));
    setDossierId('');
  }, [clientId, dossiers]);

  const total = lignes.reduce((s, l) => s + (l.quantite * l.prixUnitaire), 0);

  function addLigne() {
    setLignes(prev => [...prev, { description: '', quantite: 1, prixUnitaire: 0 }]);
  }

  function updateLigne(i: number, field: keyof Ligne, value: string | number) {
    setLignes(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  function removeLigne(i: number) {
    if (lignes.length === 1) return;
    setLignes(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { setError('Veuillez sélectionner un client'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/factures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, dossierId: dossierId || null, lignes, dateEmission, dateEcheance: dateEcheance || null, statut, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      router.push(`/factures/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#0C1B3E]">Nouvelle facture</h1>
          <p className="text-sm text-gray-500">Créer une facture pour un client</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client & Dossier */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#0C1B3E]">Informations générales</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client <span className="text-red-500">*</span></label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1B3E]/20">
                <option value="">Sélectionner un client</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{`${c.prenom || ''} ${c.nom || ''}`.trim() || c.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dossier (optionnel)</label>
              <select value={dossierId} onChange={e => setDossierId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1B3E]/20">
                <option value="">Aucun dossier</option>
                {filteredDossiers.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.titre || d.reference || 'Sans titre'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'émission</label>
              <input type="date" value={dateEmission} onChange={e => setDateEmission(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1B3E]/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'échéance</label>
              <input type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1B3E]/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select value={statut} onChange={e => setStatut(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1B3E]/20">
                <option value="brouillon">Brouillon</option>
                <option value="envoyee">Envoyée</option>
                <option value="payee">Payée</option>
                <option value="impayee">Impayée</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lignes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#0C1B3E]">Prestations</h2>
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                <th className="pb-2 text-left">Description</th>
                <th className="pb-2 text-right w-24">Qté</th>
                <th className="pb-2 text-right w-32">Prix unit. (€)</th>
                <th className="pb-2 text-right w-32">Total</th>
                <th className="pb-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lignes.map((l, i) => (
                <tr key={i}>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={l.description}
                      onChange={e => updateLigne(i, 'description', e.target.value)}
                      placeholder="Description de la prestation"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1B3E]/20"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min="1"
                      value={l.quantite}
                      onChange={e => updateLigne(i, 'quantite', Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#0C1B3E]/20"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.prixUnitaire}
                      onChange={e => updateLigne(i, 'prixUnitaire', Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#0C1B3E]/20"
                    />
                  </td>
                  <td className="py-2 px-2 text-right text-sm font-semibold text-[#0C1B3E]">
                    {(l.quantite * l.prixUnitaire).toFixed(2)} €
                  </td>
                  <td className="py-2 pl-2">
                    <button type="button" onClick={() => removeLigne(i)} disabled={lignes.length === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={3} className="pt-3 text-right font-semibold text-[#0C1B3E]">Total HT</td>
                <td className="pt-3 text-right font-bold text-lg text-[#0C1B3E]">{total.toFixed(2)} €</td>
                <td />
              </tr>
            </tfoot>
          </table>
          <button type="button" onClick={addLigne} className="flex items-center gap-2 text-sm text-[#0C1B3E] font-medium hover:text-[#D4AF5A] transition-colors">
            <Plus className="h-4 w-4" /> Ajouter une ligne
          </button>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes / Conditions de paiement</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Informations complémentaires, conditions de paiement..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1B3E]/20 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#0C1B3E] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1a2d5a] transition-colors disabled:opacity-60 shadow">
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Créer la facture'}
          </button>
        </div>
      </form>
    </div>
  );
}
