'use client';
import { useEffect, useState } from 'react';
import { Calendar, Plus, Trash2, Clock, Briefcase, Pencil, X } from 'lucide-react';

const TYPES = [
  { value: 'rdv', label: 'Rendez-vous', color: 'bg-blue-100 text-blue-700' },
  { value: 'audience', label: 'Audience', color: 'bg-red-100 text-red-700' },
  { value: 'echeance', label: 'Échéance', color: 'bg-orange-100 text-orange-700' },
  { value: 'reunion', label: 'Réunion', color: 'bg-purple-100 text-purple-700' },
];

const emptyForm = { titre: '', description: '', date_debut: '', date_fin: '', type: 'rdv', dossier_id: '' };

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return '';
  return iso.slice(0, 16);
}

export default function AgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const now = new Date();

  const load = () =>
    fetch(`/api/agenda?from=${new Date().toISOString()}`)
      .then(r => r.json())
      .then(d => setEvents(d.events || []));

  useEffect(() => {
    load();
    fetch('/api/dossiers').then(r => r.json()).then(d => setDossiers(d.dossiers || []));
  }, []);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm(emptyForm);
    load();
  }

  function openEdit(evt: any) {
    setEditingEvent(evt);
    setEditForm({
      titre: evt.titre ?? '',
      description: evt.description ?? '',
      date_debut: toDatetimeLocal(evt.date_debut),
      date_fin: toDatetimeLocal(evt.date_fin),
      type: evt.type ?? 'rdv',
      dossier_id: evt.dossier_id ?? '',
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;
    await fetch(`/api/agenda/${editingEvent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditingEvent(null);
    load();
  }

  async function deleteEvent(id: string) {
    if (!confirm('Supprimer cet événement ?')) return;
    await fetch(`/api/agenda/${id}`, { method: 'DELETE' });
    load();
  }

  const upcoming = events.filter(e => new Date(e.date_debut) >= now);
  const past = events.filter(e => new Date(e.date_debut) < now);

  const FormFields = ({ f, setF }: { f: typeof emptyForm; setF: (fn: (prev: typeof emptyForm) => typeof emptyForm) => void }) => (
    <>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Titre *</label>
        <input required value={f.titre} onChange={e => setF(p => ({ ...p, titre: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => (
            <label key={t.value} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition ${f.type === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
              <input type="radio" className="sr-only" name="type" value={t.value} checked={f.type === t.value} onChange={() => setF(p => ({ ...p, type: t.value }))} />
              {t.label}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Date/Heure début *</label>
          <input required type="datetime-local" value={f.date_debut} onChange={e => setF(p => ({ ...p, date_debut: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Fin</label>
          <input type="datetime-local" value={f.date_fin} onChange={e => setF(p => ({ ...p, date_fin: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Dossier lié</label>
        <select value={f.dossier_id} onChange={e => setF(p => ({ ...p, dossier_id: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
          <option value="">— Aucun —</option>
          {dossiers.map(d => <option key={d.id} value={d.id}>{d.reference} — {d.objet}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Note</label>
        <textarea value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))}
          rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
      </div>
    </>
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500 text-sm mt-0.5">{now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm">
          <Plus className="w-4 h-4" /> Nouvel événement
        </button>
      </div>

      {/* À venir */}
      <div className="mb-8">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" /> À venir ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-100">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucun événement à venir</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(evt => {
              const type = TYPES.find(t => t.value === evt.type) || TYPES[0];
              return (
                <div key={evt.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4 hover:shadow-md transition">
                  <div className="bg-blue-50 rounded-lg p-3 flex-shrink-0 text-center min-w-[52px]">
                    <p className="text-xl font-bold text-blue-700 leading-none">{new Date(evt.date_debut).getDate()}</p>
                    <p className="text-xs text-blue-500">{new Date(evt.date_debut).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-800">{evt.titre}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${type.color}`}>{type.label}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(evt.date_debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {evt.date_fin && ` → ${new Date(evt.date_fin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                    {evt.description && <p className="text-sm text-gray-600 mt-1">{evt.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(evt)} className="text-gray-300 hover:text-blue-500 transition p-1"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteEvent(evt.id)} className="text-gray-300 hover:text-red-500 transition p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Passés */}
      {past.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-400 mb-4 text-sm">PASSÉS ({past.length})</h2>
          <div className="space-y-2 opacity-60">
            {past.slice(0, 5).map(evt => {
              const type = TYPES.find(t => t.value === evt.type) || TYPES[0];
              return (
                <div key={evt.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                  <p className="text-sm text-gray-500 w-28">{new Date(evt.date_debut).toLocaleDateString('fr-FR')}</p>
                  <p className="text-sm text-gray-700 flex-1 font-medium">{evt.titre}</p>
                  <span className={`px-2 py-0.5 rounded text-xs ${type.color}`}>{type.label}</span>
                  <button onClick={() => openEdit(evt)} className="text-gray-300 hover:text-blue-500 transition p-1"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteEvent(evt.id)} className="text-gray-300 hover:text-red-500 transition p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Nouvel événement */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Nouvel événement</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={createEvent} className="p-6 space-y-4">
              <FormFields f={form} setF={setForm} />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Annuler</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modifier */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Modifier l'événement</h2>
              <button onClick={() => setEditingEvent(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveEdit} className="p-6 space-y-4">
              <FormFields f={editForm} setF={setEditForm} />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingEvent(null)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Annuler</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
