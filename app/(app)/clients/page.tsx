'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = { physique: 'Particulier', morale: 'Entreprise' };
const TYPE_COLORS: Record<string, string> = {
  physique: 'bg-sky-100 text-sky-700',
  morale: 'bg-violet-100 text-violet-700',
};

const AVATAR_COLORS = [
  'bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-violet-500','bg-cyan-500','bg-pink-500','bg-indigo-500',
];

function avatarColor(name: string) {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

const PAGE_SIZE = 10;

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type_personne: 'physique', nom: '', prenom: '', raison_sociale: '', telephone: '', email: '', adresse: '', nif: '', rccm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/clients?search=${encodeURIComponent(search)}`)
        .then(r => r.json())
        .then(d => { setClients(d.clients || []); setLoading(false); setPage(1); });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const reload = () => fetch(`/api/clients?search=${encodeURIComponent(search)}`).then(r => r.json()).then(d => setClients(d.clients || []));

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ type_personne: 'physique', nom: '', prenom: '', raison_sociale: '', telephone: '', email: '', adresse: '', nif: '', rccm: '' });
      reload();
    }
  }

  const filtered = clients.filter(c => !typeFilter || c.type_personne === typeFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClients = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function clientName(c: any) {
    return c.type_personne === 'morale' ? c.raison_sociale : `${c.nom} ${c.prenom || ''}`.trim();
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0C1B3E' }}>Répertoire Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} client{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-md hover:opacity-90 transition"
            style={{ background: '#0C1B3E' }}
          >
            <Plus className="w-4 h-4" /> Nouveau Client
          </button>
          <button className="flex items-center gap-2 border border-gray-200 bg-white text-gray-600 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">
            Exporter
          </button>
          <div className="relative">
            <button className="flex items-center gap-2 border border-gray-200 bg-white text-gray-600 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">
              <Filter className="w-4 h-4" /> Filtres
            </button>
          </div>
        </div>
      </div>

      {/* Search + type filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Tous les types</option>
            <option value="physique">Particulier</option>
            <option value="morale">Entreprise</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
        ) : pageClients.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">Aucun client trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Client', 'Type', 'Téléphone', 'E-mail', 'Dossiers Actifs', 'Dernier Dossier', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageClients.map((c: any) => {
                  const name = clientName(c);
                  const initial = name.charAt(0).toUpperCase();
                  const bg = avatarColor(name);
                  return (
                    <tr key={c.id} className="hover:bg-blue-50/30 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${bg}`}>
                            {initial}
                          </div>
                          <span className="font-medium text-gray-800">{name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[c.type_personne] || 'bg-gray-100 text-gray-600'}`}>
                          {TYPE_LABELS[c.type_personne] || c.type_personne}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{c.telephone || '—'}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{c.email || '—'}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs">
                          {c.nb_dossiers ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {c.dernierDossier ? new Date(c.dernierDossier).toLocaleDateString('fr-FR') : 'N/A'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/clients/${c.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Voir">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link href={`/clients/${c.id}`} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Éditer">
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <Link href={`/clients/${c.id}`} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
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
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 text-xs text-gray-500">
            <span>Page {page} de {totalPages}</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg font-medium transition ${p === page ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  style={p === page ? { background: '#0C1B3E' } : {}}>
                  {p}
                </button>
              ))}
            </div>
            <span>Affichage {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}-{Math.min(page*PAGE_SIZE, filtered.length)} sur {filtered.length} clients</span>
          </div>
        )}
      </div>

      {/* Modal nouveau client */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold" style={{ color: '#0C1B3E' }}>Nouveau client</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={createClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de personne</label>
                <div className="flex gap-3">
                  {[['physique', 'Particulier'], ['morale', 'Entreprise']].map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="type_personne" value={v} checked={form.type_personne === v}
                        onChange={e => setForm(f => ({ ...f, type_personne: e.target.value }))} className="accent-blue-600" />
                      <span className="text-sm text-gray-700">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
              {form.type_personne === 'morale' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale *</label>
                  <input required value={form.raison_sociale} onChange={e => setForm(f => ({ ...f, raison_sociale: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                    <input required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                    <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}
              {form.type_personne === 'morale' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du contact</label>
                  <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {form.type_personne === 'morale' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NIF</label>
                    <input value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">RCCM</label>
                    <input value={form.rccm} onChange={e => setForm(f => ({ ...f, rccm: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 text-white rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-50"
                  style={{ background: '#0C1B3E' }}>
                  {saving ? 'Enregistrement…' : 'Créer le client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
