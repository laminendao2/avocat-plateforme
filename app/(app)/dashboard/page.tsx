'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FolderOpen, Users, TrendingUp, Clock, ChevronRight,
  Calendar, AlertTriangle, Edit2, FileText, MessageSquare
} from 'lucide-react';

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORIES: Record<string, { label: string; color: string; dot: string }> = {
  contentieux:         { label: 'Contentieux',         color: 'bg-red-100 text-red-700',    dot: '#ef4444' },
  creation_entreprise: { label: 'Création Entreprise',  color: 'bg-blue-100 text-blue-700',  dot: '#3b82f6' },
  conseil_rh:          { label: 'Conseil RH',           color: 'bg-purple-100 text-purple-700', dot: '#a855f7' },
  foncier:             { label: 'Foncier',              color: 'bg-green-100 text-green-700', dot: '#22c55e' },
  autre:               { label: 'Autre',                color: 'bg-gray-100 text-gray-600',  dot: '#9ca3af' },
};

const STATUT_FACT: Record<string, { label: string; color: string }> = {
  paye:        { label: 'Payé',       color: 'bg-emerald-100 text-emerald-700' },
  impaye:      { label: 'Impayé',     color: 'bg-red-100 text-red-700' },
  en_attente:  { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  non_defini:  { label: '—',          color: 'bg-gray-100 text-gray-500' },
};

// ─── Donut chart (inline SVG) ─────────────────────────────────────────────────

function DonutChart({ data, total }: { data: { label: string; n: number; dot: string }[]; total: number }) {
  const R = 70, cx = 90, cy = 90, stroke = 28;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  const slices = data.map(d => {
    const pct = total ? d.n / total : 0;
    const dash = pct * circ;
    const gap = circ - dash;
    const slice = { ...d, dash, gap, offset };
    offset += dash;
    return slice;
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <svg width="180" height="180" viewBox="0 0 180 180">
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
          ) : (
            slices.map((s, i) => (
              <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                stroke={s.dot} strokeWidth={stroke}
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={-s.offset + circ / 4}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
            ))
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-xs text-gray-500">{total === 1 ? 'Dossier' : 'Dossiers'}</span>
        </div>
      </div>
      <div className="space-y-2 flex-1">
        {data.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun dossier</p>
        ) : data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.dot }} />
              <span className="text-gray-700">{d.label}</span>
            </div>
            <span className="font-semibold text-gray-900 ml-2">
              {total ? Math.round(d.n / total * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mini calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ events }: { events: { id: string; titre: string; date_debut: string; type: string }[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventDays = new Set(events.map(e => new Date(e.date_debut).getDate()));
  const days: (number | null)[] = Array((firstDay + 6) % 7).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const monthLabel = today.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2 text-center">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {['L','M','M','J','V','S','D'].map((d, i) => (
          <div key={i} className="text-[10px] text-gray-400 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {days.map((d, i) => (
          <div key={i} className={`text-xs rounded py-0.5 ${
            d === null ? '' :
            d === today.getDate() ? 'bg-[#0C1B3E] text-white font-bold' :
            eventDays.has(d) ? 'bg-blue-100 text-blue-700 font-semibold' :
            'text-gray-600 hover:bg-gray-100'
          }`}>
            {d ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sparkline bar chart ──────────────────────────────────────────────────────

function Sparkline({ value, max }: { value: number; max: number }) {
  const bars = [0.3, 0.5, 0.4, 0.7, 0.6, 0.8, value / Math.max(max, 1)];
  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((h, i) => (
        <div key={i} className="w-2 rounded-sm bg-current opacity-40" style={{ height: `${h * 100}%` }} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(data => {
      setStats({ totalDossiers: 0, totalClients: 0, enCours: 0, clotures: 0,
        parCategorie: [], dossiersRecents: [], agendaProchain: [],
        thisMonthCount: 0, lastMonthCount: 0, ...data });
    });
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-[#0C1B3E] border-t-transparent rounded-full" />
      </div>
    );
  }

  const trend = stats.lastMonthCount > 0
    ? Math.round(((stats.thisMonthCount - stats.lastMonthCount) / stats.lastMonthCount) * 100)
    : stats.thisMonthCount > 0 ? 100 : 0;

  const donutData = stats.parCategorie.map(({ categorie, n }: any) => {
    const cat = CATEGORIES[categorie] || CATEGORIES.autre;
    return { label: cat.label, n, dot: cat.dot };
  });

  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0C1B3E]">Tableau de bord</h1>
        <p className="text-gray-400 text-sm capitalize">{dateLabel}</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dossiers */}
        <Link href="/dossiers" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div className="text-blue-500 group-hover:text-blue-600 transition">
              <Sparkline value={stats.totalDossiers} max={Math.max(stats.totalDossiers, 5)} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalDossiers}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Dossiers</p>
          {trend !== 0 && (
            <p className={`text-xs font-medium mt-1 ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend > 0 ? '+' : ''}{trend}% ce mois-ci
            </p>
          )}
        </Link>

        {/* En cours */}
        <Link href="/dossiers?statut=en_cours" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.enCours}</p>
          <p className="text-xs text-gray-500 mt-0.5">En cours</p>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{stats.enCours}/{stats.totalDossiers}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-orange-500 h-1.5 rounded-full transition-all"
                style={{ width: stats.totalDossiers ? `${(stats.enCours / stats.totalDossiers) * 100}%` : '0%' }} />
            </div>
          </div>
        </Link>

        {/* Clôturés */}
        <Link href="/dossiers?statut=cloture" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.clotures}</p>
          <p className="text-xs text-gray-500 mt-0.5">Clôturés</p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.totalDossiers ? Math.round((stats.clotures / stats.totalDossiers) * 100) : 0}% du total
          </p>
        </Link>

        {/* Clients */}
        <Link href="/clients" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
          <p className="text-xs text-gray-500 mt-0.5">Clients</p>
        </Link>
      </div>

      {/* ── Middle row ── */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Donut chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-800">Répartition des Dossiers par Domaine de Droit</h2>
            <Link href="/dossiers" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              Voir tout <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <DonutChart data={donutData} total={stats.totalDossiers} />
        </div>

        {/* Agenda */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Agenda et Échéances</h2>
            <Link href="/agenda" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              Voir tout <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <MiniCalendar events={stats.agendaProchain} />
          <div className="mt-4 space-y-2">
            {stats.agendaProchain.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">Aucun événement à venir</p>
            ) : stats.agendaProchain.slice(0, 3).map((evt: any) => {
              const d = new Date(evt.date_debut);
              const isUrgent = d <= new Date(Date.now() + 3 * 86400000);
              return (
                <div key={evt.id} className={`flex items-start gap-2 p-2 rounded-lg ${isUrgent ? 'bg-red-50 border border-red-100' : 'bg-blue-50'}`}>
                  <div className={`rounded p-1 shrink-0 ${isUrgent ? 'bg-red-100' : 'bg-blue-100'}`}>
                    {isUrgent
                      ? <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      : <Calendar className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{evt.titre}</p>
                    <p className="text-[10px] text-gray-500">
                      {d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}, {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Recent dossiers table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-800">Dossiers récents</h2>
          <Link href="/dossiers" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
            Voir tout <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {stats.dossiersRecents.length === 0 ? (
          <div className="text-center py-10">
            <FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucun dossier</p>
            <Link href="/dossiers/nouveau" className="mt-3 inline-block bg-[#0C1B3E] text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition">
              Créer un dossier
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  {['Référence', 'Client', 'Domaine', 'Objet', 'Échéance', 'Statut Facturation', 'Actions'].map(h => (
                    <th key={h} className="pb-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.dossiersRecents.map((d: any) => {
                  const cat = CATEGORIES[d.categorie] || CATEGORIES.autre;
                  const fact = STATUT_FACT[d.statutFacturation] || STATUT_FACT.non_defini;
                  const ech = d.dateEcheance ? new Date(d.dateEcheance) : null;
                  const echStr = ech ? ech.toLocaleDateString('fr-FR') : '—';
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 pr-4">
                        <Link href={`/dossiers/${d.id}`} className="text-blue-600 font-mono text-xs font-semibold hover:underline">{d.reference}</Link>
                      </td>
                      <td className="py-3 pr-4 text-gray-700 text-xs whitespace-nowrap">{d.client_nom} {d.client_prenom}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.color}`}>{cat.label}</span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 text-xs max-w-[180px] truncate">{d.objet || d.titre}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">{echStr}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${fact.color}`}>{fact.label}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/dossiers/${d.id}`} className="text-gray-400 hover:text-blue-600 transition" title="Modifier">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <Link href={`/dossiers/${d.id}?tab=documents`} className="text-gray-400 hover:text-emerald-600 transition" title="Documents">
                            <FileText className="w-3.5 h-3.5" />
                          </Link>
                          <Link href={`/dossiers/${d.id}?tab=actions`} className="text-gray-400 hover:text-purple-600 transition" title="Actions">
                            <MessageSquare className="w-3.5 h-3.5" />
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
      </div>
    </div>
  );
}
