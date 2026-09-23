'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FolderOpen, Users, Calendar, TrendingUp,
  Gavel, Building2, UserCheck, MapPin, Clock, ChevronRight
} from 'lucide-react';

const CATEGORIES: Record<string, { label: string; color: string; icon: any }> = {
  contentieux:        { label: 'Contentieux',        color: 'bg-red-100 text-red-700',    icon: Gavel },
  creation_entreprise:{ label: 'Création Entreprise', color: 'bg-blue-100 text-blue-700',  icon: Building2 },
  conseil_rh:         { label: 'Conseil RH',          color: 'bg-purple-100 text-purple-700', icon: UserCheck },
  foncier:            { label: 'Foncier',             color: 'bg-green-100 text-green-700', icon: MapPin },
  autre:              { label: 'Autre',               color: 'bg-gray-100 text-gray-700',  icon: FolderOpen },
};

const STATUTS: Record<string, string> = {
  en_cours: 'bg-blue-100 text-blue-700',
  en_attente: 'bg-yellow-100 text-yellow-700',
  cloture: 'bg-green-100 text-green-700',
};

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(data => {
      setStats({
        totalDossiers: 0,
        totalClients: 0,
        enCours: 0,
        clotures: 0,
        parCategorie: [],
        dossiersRecents: [],
        agendaProchain: [],
        ...data,
      });
    });
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Dossiers', value: stats.totalDossiers, icon: FolderOpen, color: 'from-blue-500 to-blue-600', ring: 'group-hover:shadow-blue-500/30', href: '/dossiers' },
    { label: 'En cours', value: stats.enCours, icon: Clock, color: 'from-orange-400 to-orange-500', ring: 'group-hover:shadow-orange-500/30', href: '/dossiers?statut=en_cours' },
    { label: 'Clôturés', value: stats.clotures, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600', ring: 'group-hover:shadow-emerald-500/30', href: '/dossiers?statut=cloture' },
    { label: 'Clients', value: stats.totalClients, icon: Users, color: 'from-purple-500 to-purple-600', ring: 'group-hover:shadow-purple-500/30', href: '/clients' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0C1B3E]">Tableau de bord</h1>
        <p className="text-gray-500 mt-1 capitalize">{new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, ring, href }) => (
          <Link key={label} href={href} className={`bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white hover:shadow-xl ${ring} hover:-translate-y-0.5 transition-all duration-200 group animate-fade-in`}>
            <div className={`w-11 h-11 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-3 shadow-md`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Dossiers par catégorie */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-white/80 p-6 hover:shadow-md transition-shadow duration-200">
          <h2 className="font-semibold text-gray-800 mb-4">Dossiers par catégorie</h2>
          <div className="space-y-3">
            {stats.parCategorie.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Aucun dossier</p>
            ) : (
              stats.parCategorie.map(({ categorie, n }: any) => {
                const cat = CATEGORIES[categorie] || CATEGORIES.autre;
                const Icon = cat.icon;
                const pct = stats.totalDossiers ? Math.round((n / stats.totalDossiers) * 100) : 0;
                return (
                  <div key={categorie}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cat.color}`}>
                          <Icon className="w-3 h-3" /> {cat.label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{n}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Agenda */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-white/80 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Prochains événements</h2>
            <Link href="/agenda" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
              Voir tout <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.agendaProchain.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Aucun événement à venir</p>
            ) : (
              stats.agendaProchain.map((evt: any) => (
                <div key={evt.id} className="flex items-start gap-3 p-3 bg-blue-50/60 rounded-lg">
                  <div className="bg-blue-100 text-blue-700 rounded-lg p-2 flex-shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{evt.titre}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(evt.date_debut).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dossiers récents */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-white/80 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Dossiers récents</h2>
          <Link href="/dossiers" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
            Voir tout <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          {stats.dossiersRecents.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aucun dossier créé</p>
              <Link href="/dossiers/nouveau" className="mt-3 inline-block bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                Créer un dossier
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Référence</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Catégorie</th>
                  <th className="pb-3 font-medium">Objet</th>
                  <th className="pb-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.dossiersRecents.map((d: any) => {
                  const cat = CATEGORIES[d.categorie] || CATEGORIES.autre;
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition">
                      <td className="py-3">
                        <Link href={`/dossiers/${d.id}`} className="text-blue-600 font-mono font-medium hover:underline">{d.reference}</Link>
                      </td>
                      <td className="py-3 text-gray-700">{d.client_nom} {d.client_prenom}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${cat.color}`}>{cat.label}</span>
                      </td>
                      <td className="py-3 text-gray-600 max-w-xs truncate">{d.objet}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUTS[d.statut] || 'bg-gray-100 text-gray-700'}`}>
                          {d.statut?.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
