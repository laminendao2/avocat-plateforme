'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2, Shield, User, Mail, Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const ROLES = [
  { value: 'avocat', label: 'Avocat' },
  { value: 'assistant', label: 'Assistant(e)' },
  { value: 'admin', label: 'Administrateur' },
];

interface UserRecord {
  id: string;
  displayName?: string;
  email: string;
  role: string;
  createdAt?: string;
}

export default function AdminAvocatsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  // Form state
  const [form, setForm] = useState({ displayName: '', email: '', password: '', role: 'avocat' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchUsers() {
    const res = await fetch('/api/admin/avocats');
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    const res = await fetch('/api/admin/avocats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setMsg({ type: 'success', text: `Compte créé pour ${form.displayName} (${form.email})` });
      setForm({ displayName: '', email: '', password: '', role: 'avocat' });
      fetchUsers();
    } else {
      setMsg({ type: 'error', text: data.error ?? 'Erreur lors de la création' });
    }
  }

  async function handleDelete(user: UserRecord) {
    if (!confirm(`Supprimer le compte de ${user.displayName ?? user.email} ? Cette action est irréversible.`)) return;
    setDeletingId(user.id);
    const res = await fetch('/api/admin/avocats', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id }),
    });
    const data = await res.json();
    setDeletingId(null);
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      alert(data.error ?? 'Erreur lors de la suppression');
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  if (forbidden) return (
    <div className="p-8 text-center">
      <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Accès refusé</h2>
      <p className="text-gray-500">Cette page est réservée aux administrateurs.</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des avocats</h1>
          <p className="text-sm text-gray-500">Créer et gérer les comptes de l'équipe</p>
        </div>
      </div>

      {/* Formulaire de création */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="flex items-center gap-2 font-semibold text-gray-800 mb-5">
          <UserPlus className="w-4 h-4 text-blue-600" />
          Créer un nouveau compte
        </h2>

        {msg && (
          <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg mb-4 ${
            msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {msg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="Me Dupont"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="avocat@cabinet.com"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe temporaire *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Minimum 6 caractères"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Créer le compte
            </button>
          </div>
        </form>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">
          Équipe ({users.length} membre{users.length > 1 ? 's' : ''})
        </h2>

        {users.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucun membre pour l'instant.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map(user => {
              const isAdmin = ['laminendao2@gmail.com', 'laminendao2@hotmail.com'].includes(user.email);
              const initials = (user.displayName ?? user.email ?? '?').charAt(0).toUpperCase();
              return (
                <div key={user.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{user.displayName ?? '—'}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      isAdmin ? 'bg-purple-100 text-purple-700' :
                      user.role === 'assistant' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {isAdmin ? 'Admin' : ROLES.find(r => r.value === user.role)?.label ?? user.role}
                    </span>
                    {!isAdmin && (
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer ce compte"
                      >
                        {deletingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
