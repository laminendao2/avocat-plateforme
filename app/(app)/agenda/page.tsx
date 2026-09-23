'use client';
import { useEffect, useState, useCallback } from 'react';
import { Calendar, Plus, Trash2, Clock, Pencil, X, ChevronLeft, ChevronRight } from 'lucide-react';

const TYPES = [
  { value: 'rdv',      label: 'Rendez-vous', color: 'bg-blue-100 text-blue-700',   dot: '#3B82F6' },
  { value: 'audience', label: 'Audience',    color: 'bg-red-100 text-red-700',     dot: '#EF4444' },
  { value: 'echeance', label: 'Échéance',    color: 'bg-orange-100 text-orange-700', dot: '#F97316' },
  { value: 'reunion',  label: 'Réunion',     color: 'bg-purple-100 text-purple-700', dot: '#8B5CF6' },
];

const FR_DAYS   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const FR_DAYS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const FR_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const emptyForm = { titre: '', description: '', date_debut: '', date_fin: '', type: 'rdv', dossier_id: '', toute_la_journee: false };

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return '';
  return iso.slice(0, 16);
}

// ----- date helpers -----
function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const r = new Date(d);
  r.setDate(d.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function eventsOnDay(events: any[], d: Date) {
  return events.filter(e => sameDay(new Date(e.date_debut), d));
}

// ----- CalendarMonth -----
function CalendarMonth({ year, month, events, cursor, setCursor, setView }: any) {
  // Build grid: 6 rows × 7 cols (Mon → Sun)
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - (startDow === 0 ? 6 : startDow - 1));

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  const today = new Date();

  return (
    <div>
      {/* Header days */}
      <div className="grid grid-cols-7 mb-1">
        {FR_DAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold py-2" style={{ color: '#6B7A99' }}>{d}</div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 gap-px" style={{ background: 'rgba(12,27,62,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        {cells.map((cell, i) => {
          const inMonth = cell.getMonth() === month;
          const isToday = sameDay(cell, today);
          const isCursor = sameDay(cell, cursor);
          const dayEvents = eventsOnDay(events, cell);
          return (
            <div
              key={i}
              onClick={() => { setCursor(new Date(cell)); setView('jour'); }}
              className="cursor-pointer transition-all"
              style={{
                background: isCursor ? '#0C1B3E' : isToday ? '#EBF0FF' : 'white',
                minHeight: 80,
                padding: '6px 6px 4px',
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              <span
                className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1"
                style={{
                  color: isCursor ? '#fff' : isToday ? '#3B82F6' : inMonth ? '#0C1B3E' : '#9CA3AF',
                  background: isCursor ? '#3B82F6' : 'transparent',
                }}
              >
                {cell.getDate()}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev: any) => {
                  const t = TYPES.find(t => t.value === ev.type) || TYPES[0];
                  return (
                    <div
                      key={ev.id}
                      className="text-[10px] truncate rounded px-1 leading-4 font-medium"
                      style={{ background: `${t.dot}18`, color: t.dot }}
                    >
                      {ev.titre}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px]" style={{ color: '#6B7A99' }}>+{dayEvents.length - 3} autre{dayEvents.length - 3 > 1 ? 's' : ''}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----- CalendarWeek -----
function CalendarWeek({ weekStart, events, setCursor, setView }: any) {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, i) => {
        const isToday = sameDay(day, today);
        const dayEvents = eventsOnDay(events, day);
        return (
          <div
            key={i}
            className="rounded-xl border cursor-pointer transition-all hover:shadow-md"
            style={{ borderColor: isToday ? '#3B82F6' : 'rgba(12,27,62,0.08)', background: isToday ? '#EBF0FF' : 'white', minHeight: 120 }}
            onClick={() => { setCursor(new Date(day)); setView('jour'); }}
          >
            <div className="text-center py-2 border-b" style={{ borderColor: 'rgba(12,27,62,0.08)' }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: '#6B7A99' }}>{FR_DAYS[i]}</p>
              <p className="text-lg font-bold" style={{ color: isToday ? '#3B82F6' : '#0C1B3E' }}>{day.getDate()}</p>
            </div>
            <div className="p-1.5 space-y-1">
              {dayEvents.slice(0, 4).map((ev: any) => {
                const t = TYPES.find(t => t.value === ev.type) || TYPES[0];
                return (
                  <div key={ev.id} className="text-[10px] truncate rounded px-1.5 py-0.5 font-medium leading-4"
                    style={{ background: `${t.dot}18`, color: t.dot }}>
                    {new Date(ev.date_debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} {ev.titre}
                  </div>
                );
              })}
              {dayEvents.length > 4 && <div className="text-[10px] text-center" style={{ color: '#6B7A99' }}>+{dayEvents.length - 4}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ----- CalendarDay -----
function CalendarDay({ day, events, openEdit, deleteEvent }: any) {
  const dayEvents = eventsOnDay(events, day).sort((a: any, b: any) =>
    new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime()
  );

  return (
    <div>
      <h3 className="text-base font-semibold mb-4" style={{ color: '#0C1B3E' }}>
        {FR_DAYS_FULL[(day.getDay() + 6) % 7]} {day.getDate()} {FR_MONTHS[day.getMonth()]} {day.getFullYear()}
      </h3>
      {dayEvents.length === 0 ? (
        <div className="text-center py-12 rounded-xl border" style={{ borderColor: 'rgba(12,27,62,0.08)', background: 'white' }}>
          <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: '#D1D5DB' }} />
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Aucun événement ce jour</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEvents.map((ev: any) => {
            const t = TYPES.find(t => t.value === ev.type) || TYPES[0];
            return (
              <div key={ev.id} className="bg-white rounded-xl border p-4 flex items-start gap-4 shadow-sm hover:shadow-md transition"
                style={{ borderColor: 'rgba(12,27,62,0.08)', borderLeft: `4px solid ${t.dot}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-800">{ev.titre}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.color}`}>{t.label}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {ev.toute_la_journee
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>Toute la journée</span>
                      : <>
                          {new Date(ev.date_debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {ev.date_fin && ` → ${new Date(ev.date_fin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                        </>
                    }
                  </p>
                  {ev.description && <p className="text-sm text-gray-600 mt-1">{ev.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(ev)} className="text-gray-300 hover:text-blue-500 transition p-1"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteEvent(ev.id)} className="text-gray-300 hover:text-red-500 transition p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ----- CalendarYear -----
function MiniMonth({ year, month, events, setCursor, setView }: any) {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - (startDow === 0 ? 6 : startDow - 1));
  const cells: Date[] = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  const today = new Date();

  return (
    <div className="bg-white rounded-xl border p-3" style={{ borderColor: 'rgba(12,27,62,0.08)' }}>
      <p className="text-xs font-bold text-center mb-2 uppercase tracking-wide" style={{ color: '#0C1B3E' }}>{FR_MONTHS[month]}</p>
      <div className="grid grid-cols-7 mb-0.5">
        {['L','M','M','J','V','S','D'].map((d,i) => (
          <div key={i} className="text-center text-[9px] font-semibold" style={{ color: '#9CA3AF' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const inMonth = cell.getMonth() === month;
          const isToday = sameDay(cell, today);
          const hasEvents = eventsOnDay(events, cell).length > 0;
          return (
            <div
              key={i}
              onClick={() => { setCursor(new Date(cell)); setView('jour'); }}
              className="flex flex-col items-center cursor-pointer py-0.5"
              style={{ opacity: inMonth ? 1 : 0.2 }}
            >
              <span className="text-[10px] w-5 h-5 flex items-center justify-center rounded-full"
                style={{
                  color: isToday ? '#fff' : '#0C1B3E',
                  background: isToday ? '#3B82F6' : 'transparent',
                  fontWeight: isToday ? 700 : 400,
                }}>
                {cell.getDate()}
              </span>
              {hasEvents && inMonth && (
                <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: '#3B82F6' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarYear({ year, events, setCursor, setView }: any) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 12 }, (_, m) => (
        <MiniMonth key={m} year={year} month={m} events={events} setCursor={setCursor} setView={setView} />
      ))}
    </div>
  );
}

// ----- Main Page -----
export default function AgendaPage() {
  const [events, setEvents]     = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [dossiers, setDossiers] = useState<any[]>([]);

  // Calendar state
  const [view, setView]     = useState<'mois'|'semaine'|'jour'|'annee'>('mois');
  const [cursor, setCursor] = useState(new Date());

  const now = new Date();

  const load = useCallback(() =>
    fetch('/api/agenda')
      .then(r => r.json())
      .then(d => setEvents(d.events || [])), []);

  useEffect(() => {
    load();
    fetch('/api/dossiers').then(r => r.json()).then(d => setDossiers(d.dossiers || []));
  }, [load]);

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
      toute_la_journee: evt.toute_la_journee ?? false,
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

  // Navigation
  function prev() {
    const d = new Date(cursor);
    if (view === 'jour')    d.setDate(d.getDate() - 1);
    if (view === 'semaine') d.setDate(d.getDate() - 7);
    if (view === 'mois')    d.setMonth(d.getMonth() - 1);
    if (view === 'annee')   d.setFullYear(d.getFullYear() - 1);
    setCursor(d);
  }
  function next() {
    const d = new Date(cursor);
    if (view === 'jour')    d.setDate(d.getDate() + 1);
    if (view === 'semaine') d.setDate(d.getDate() + 7);
    if (view === 'mois')    d.setMonth(d.getMonth() + 1);
    if (view === 'annee')   d.setFullYear(d.getFullYear() + 1);
    setCursor(d);
  }

  function navLabel() {
    if (view === 'jour')    return `${FR_DAYS_FULL[(cursor.getDay()+6)%7]} ${cursor.getDate()} ${FR_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === 'semaine') {
      const ws = startOfWeek(cursor);
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      return `${ws.getDate()} ${FR_MONTHS[ws.getMonth()].slice(0,3)} — ${we.getDate()} ${FR_MONTHS[we.getMonth()].slice(0,3)} ${we.getFullYear()}`;
    }
    if (view === 'mois')  return `${FR_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === 'annee') return `${cursor.getFullYear()}`;
    return '';
  }

  const upcoming = events.filter(e => new Date(e.date_debut) >= now)
    .sort((a,b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime());
  const past = events.filter(e => new Date(e.date_debut) < now)
    .sort((a,b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime());

  const VIEWS: { key: 'jour'|'semaine'|'mois'|'annee'; label: string }[] = [
    { key: 'jour',    label: 'Jour' },
    { key: 'semaine', label: 'Semaine' },
    { key: 'mois',    label: 'Mois' },
    { key: 'annee',   label: 'Année' },
  ];

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

      {/* Toute la journée toggle */}
      <button
        type="button"
        onClick={() => setF(p => ({
          ...p,
          toute_la_journee: !p.toute_la_journee,
          // Quand on coche, on convertit la date existante en date seule
          date_debut: !p.toute_la_journee
            ? (p.date_debut ? p.date_debut.slice(0, 10) : '')
            : (p.date_debut ? p.date_debut + 'T00:00' : ''),
          date_fin: '',
        }))}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border transition text-sm font-medium"
        style={{
          background: f.toute_la_journee ? 'rgba(59,130,246,0.08)' : 'white',
          borderColor: f.toute_la_journee ? '#3B82F6' : '#E5E7EB',
          color: f.toute_la_journee ? '#1D4ED8' : '#6B7280',
        }}
      >
        {/* Toggle pill */}
        <span
          className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200"
          style={{ background: f.toute_la_journee ? '#3B82F6' : '#D1D5DB' }}
        >
          <span
            className="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5"
            style={{ transform: f.toute_la_journee ? 'translateX(17px)' : 'translateX(2px)' }}
          />
        </span>
        <span>Toute la journée</span>
        {f.toute_la_journee && (
          <span className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
            Activé
          </span>
        )}
      </button>

      {/* Champs date */}
      {f.toute_la_journee ? (
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Date *</label>
          <input
            required
            type="date"
            value={f.date_debut}
            onChange={e => setF(p => ({ ...p, date_debut: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      )}

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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      {/* ===== CALENDRIER ===== */}
      <div className="bg-white rounded-2xl border shadow-sm mb-8" style={{ borderColor: 'rgba(12,27,62,0.08)' }}>

        {/* Barre de contrôle du calendrier */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'rgba(12,27,62,0.08)' }}>

          {/* View switcher */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(12,27,62,0.12)' }}>
            {VIEWS.map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className="px-4 py-1.5 text-sm font-medium transition"
                style={{
                  background: view === v.key ? '#0C1B3E' : 'white',
                  color: view === v.key ? '#fff' : '#6B7A99',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Nav arrows + label */}
          <div className="flex items-center gap-2">
            <button onClick={prev} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition" style={{ color: '#0C1B3E' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold min-w-[180px] text-center" style={{ color: '#0C1B3E' }}>{navLabel()}</span>
            <button onClick={next} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition" style={{ color: '#0C1B3E' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => { setCursor(new Date()); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border transition hover:bg-gray-50"
            style={{ color: '#3B82F6', borderColor: '#3B82F6' }}>
            Aujourd'hui
          </button>

          {/* Spacer + new event */}
          <div className="flex-1" />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-xl shadow-md text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}
          >
            <Plus className="w-4 h-4" /> Nouvel événement
          </button>
        </div>

        {/* Calendar body */}
        <div className="p-4 lg:p-5">
          {view === 'mois' && (
            <CalendarMonth
              year={cursor.getFullYear()} month={cursor.getMonth()}
              events={events} cursor={cursor} setCursor={setCursor} setView={setView}
            />
          )}
          {view === 'semaine' && (
            <CalendarWeek
              weekStart={startOfWeek(cursor)}
              events={events} setCursor={setCursor} setView={setView}
            />
          )}
          {view === 'jour' && (
            <CalendarDay day={cursor} events={events} openEdit={openEdit} deleteEvent={deleteEvent} />
          )}
          {view === 'annee' && (
            <CalendarYear year={cursor.getFullYear()} events={events} setCursor={setCursor} setView={setView} />
          )}
        </div>
      </div>

      {/* ===== À VENIR ===== */}
      <div className="mb-8">
        <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#0C1B3E' }}>
          <Clock className="w-4 h-4 text-blue-600" /> À venir ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border" style={{ borderColor: 'rgba(12,27,62,0.08)' }}>
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucun événement à venir</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(evt => {
              const type = TYPES.find(t => t.value === evt.type) || TYPES[0];
              return (
                <div key={evt.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 hover:shadow-md transition"
                  style={{ borderColor: 'rgba(12,27,62,0.08)', borderLeft: `4px solid ${type.dot}` }}>
                  <div className="rounded-lg p-3 flex-shrink-0 text-center min-w-[52px]"
                    style={{ background: `${type.dot}14` }}>
                    <p className="text-xl font-bold leading-none" style={{ color: type.dot }}>{new Date(evt.date_debut).getDate()}</p>
                    <p className="text-xs" style={{ color: type.dot }}>{new Date(evt.date_debut).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
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

      {/* ===== PASSÉS ===== */}
      {past.length > 0 && (
        <div>
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
            Passés ({past.length})
          </h2>
          <div className="space-y-2 opacity-60">
            {past.slice(0, 5).map(evt => {
              const type = TYPES.find(t => t.value === evt.type) || TYPES[0];
              return (
                <div key={evt.id} className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3"
                  style={{ borderColor: 'rgba(12,27,62,0.08)' }}>
                  <p className="text-sm text-gray-500 sm:w-28">{new Date(evt.date_debut).toLocaleDateString('fr-FR')}</p>
                  <p className="text-sm text-gray-700 flex-1 min-w-[120px] font-medium">{evt.titre}</p>
                  <span className={`px-2 py-0.5 rounded text-xs ${type.color}`}>{type.label}</span>
                  <button onClick={() => openEdit(evt)} className="text-gray-300 hover:text-blue-500 transition p-1"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteEvent(evt.id)} className="text-gray-300 hover:text-red-500 transition p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== MODAL NOUVEAU ===== */}
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

      {/* ===== MODAL MODIFIER ===== */}
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
