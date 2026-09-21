'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock } from 'lucide-react';

const TYPES: Record<string,{label:string,color:string}> = {
  rdv: {label:'Rendez-vous', color:'bg-blue-100 text-blue-700'},
  audience: {label:'Audience', color:'bg-red-100 text-red-700'},
  echeance: {label:'Échéance', color:'bg-orange-100 text-orange-700'},
  reunion: {label:'Réunion', color:'bg-purple-100 text-purple-700'},
};

export default function PortailAgendaPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portail/agenda').then(r => {
      if (r.status === 401) { router.push('/portail/login'); return null; }
      return r.json();
    }).then(d => { if (d) { setEvents(d.events || []); setLoading(false); } });
  }, [router]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Mes rendez-vous</h1>
      <p className="text-gray-500 text-sm mb-6">Prochaines échéances vous concernant</p>
      {events.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucun événement à venir</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(evt => {
            const type = TYPES[evt.type] ?? {label: evt.type, color: 'bg-gray-100 text-gray-600'};
            return (
              <div key={evt.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
                <div className="bg-blue-50 rounded-lg p-3 flex-shrink-0 text-center min-w-[52px]">
                  <p className="text-xl font-bold text-blue-700 leading-none">{new Date(evt.date_debut).getDate()}</p>
                  <p className="text-xs text-blue-500">{new Date(evt.date_debut).toLocaleDateString('fr-FR',{month:'short'}).toUpperCase()}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-800">{evt.titre}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${type.color}`}>{type.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(evt.date_debut).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                    {evt.date_fin && ` → ${new Date(evt.date_fin).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`}
                  </p>
                  {evt.description && <p className="text-sm text-gray-600 mt-1">{evt.description}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
