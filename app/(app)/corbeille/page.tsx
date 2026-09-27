'use client';
import { useEffect, useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Users, FolderOpen } from 'lucide-react';

interface CorbeilleItem {
  id: string;
  type: 'client' | 'dossier';
  label: string;
  reference: string;
  deletedAt: string | null;
  expiresIn: number;
}

export default function CorbeillePage() {
  const [items, setItems] = useState<CorbeilleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/corbeille');
    if (res.ok) {
      const d = await res.json();
      setItems(d.items || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function restore(item: CorbeilleItem) {
    if (!confirm(`Restaurer "${item.label}" ?`)) return;
    setWorking(item.id);
    const res = await fetch(`/api/corbeille/${item.type}/${item.id}`, { method: 'PUT' });
    if (res.ok) { await load(); } else { alert('Erreur lors de la restauration'); }
    setWorking(null);
  }

  async function permanentDelete(item: CorbeilleItem) {
    if (!confirm(`Supprimer définitivement "${item.label}" ? Cette action est irréversible.`)) return;
    setWorking(item.id);
    const res = await fetch(`/api/corbeille/${item.type}/${item.id}`, { method: 'DELETE' });
    if (res.ok) { await load(); } else { alert('Erreur lors de la suppression'); }
    setWorking(null);
  }

  const clients = items.filter(i => i.type === 'client');
  const dossiers = items.filter(i => i.type === 'dossier');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-gray-400" />
          Corbeille
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Les éléments supprimés sont conservés 30 jours avant suppression définitive automatique.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
          <Trash2 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base font-medium">La corbeille est vide</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dossiers.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" /> Dossiers ({dossiers.length})
              </h2>
              <div className="space-y-2">
                {dossiers.map(item => <CorbeilleRow key={item.id} item={item} working={working} onRestore={restore} onDelete={permanentDelete} />)}
              </div>
            </section>
          )}
          {clients.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Clients ({clients.length})
              </h2>
              <div className="space-y-2">
                {clients.map(item => <CorbeilleRow key={item.id} item={item} working={working} onRestore={restore} onDelete={permanentDelete} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function CorbeilleRow({ item, working, onRestore, onDelete }: {
  item: CorbeilleItem;
  working: string | null;
  onRestore: (i: CorbeilleItem) => void;
  onDelete: (i: CorbeilleItem) => void;
}) {
  const isWorking = working === item.id;
  const urgent = item.expiresIn <= 3;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">{item.label}</p>
        <p className="text-xs text-gray-400 font-mono">{item.reference}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {urgent ? (
          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            {item.expiresIn === 0 ? 'Expire aujourd\'hui' : `${item.expiresIn}j`}
          </span>
        ) : (
          <span className="text-xs text-gray-400">{item.expiresIn}j restants</span>
        )}
        <button
          onClick={() => onRestore(item)}
          disabled={isWorking}
          title="Restaurer"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 transition disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurer
        </button>
        <button
          onClick={() => onDelete(item)}
          disabled={isWorking}
          title="Supprimer définitivement"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-red-600 border border-red-200 hover:bg-red-50 transition disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Supprimer
        </button>
      </div>
    </div>
  );
}
