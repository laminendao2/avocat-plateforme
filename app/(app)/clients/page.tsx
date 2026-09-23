'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Search, Phone, Mail, FolderOpen } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type_personne:'physique', nom:'', prenom:'', raison_sociale:'', telephone:'', email:'', adresse:'', nif:'', rccm:'' });

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/clients?search=${encodeURIComponent(search)}`).then(r => r.json()).then(d => { setClients(d.clients || []); setLoading(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = () => {
    setLoading(true);
    fetch(`/api/clients?search=${encodeURIComponent(search)}`).then(r => r.json()).then(d => { setClients(d.clients || []); setLoading(false); });
  };

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/clients', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    if (res.ok) {
      setShowForm(false);
      setForm({ type_personne:'physique', nom:'', prenom:'', raison_sociale:'', telephone:'', email:'', adresse:'', nif:'', rccm:'' });
      setSearch(''); load();
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clients.length} client(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 font-medium text-sm">
          <Plus className="w-4 h-4" /> Nouveau client
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un client..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucun client trouvé</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-blue-600 hover:underline text-sm">Créer le premier client</button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((c: any) => (
            <Link key={c.id} href={`/clients/${c.id}`} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
                  {c.nom.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-gray-400 font-mono">{c.reference}</span>
              </div>
              <p className="font-semibold text-gray-800 group-hover:text-blue-700 transition">
                {c.type_personne === 'morale' ? c.raison_sociale : `${c.nom} ${c.prenom || ''}`}
              </p>
              {c.type_personne === 'morale' && <p className="text-xs text-gray-500">{c.nom}</p>}
              <div className="mt-3 space-y-1">
                {c.telephone && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Phone className="w-3 h-3" />{c.telephone}</div>}
                {c.email && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Mail className="w-3 h-3" />{c.email}</div>}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1 text-xs text-gray-400">
                <FolderOpen className="w-3 h-3" /> {c.nb_dossiers} dossier(s)
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal nouveau client */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Nouveau client</h2>
            </div>
            <form onSubmit={createClient} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
                <div className="flex gap-3">
                  {['physique','morale'].map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="type" value={t} checked={form.type_personne===t} onChange={() => setForm({...form, type_personne:t})} className="accent-blue-600" />
                      <span className="text-sm capitalize">{t === 'physique' ? 'Personne physique' : 'Personne morale'}</span>
                    </label>
                  ))}
                </div>
              </div>
              {form.type_personne === 'morale' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Raison sociale *</label>
                  <input required value={form.raison_sociale} onChange={e => setForm({...form, raison_sociale:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Nom *</label>
                  <input required value={form.nom} onChange={e => setForm({...form, nom:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Prénom</label>
                  <input value={form.prenom} onChange={e => setForm({...form, prenom:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Téléphone</label>
                  <input value={form.telephone} onChange={e => setForm({...form, telephone:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Adresse</label>
                <input value={form.adresse} onChange={e => setForm({...form, adresse:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">NIF</label>
                  <input value={form.nif} onChange={e => setForm({...form, nif:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">RCCM</label>
                  <input value={form.rccm} onChange={e => setForm({...form, rccm:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Annuler</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
