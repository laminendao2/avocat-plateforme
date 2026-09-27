import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthClaims } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  try {
    const claims = await getAuthClaims(req);
    if (!claims) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const uid = claims.uid;
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const ago30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ago7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const notifications: any[] = [];

    const [dossiersSnap, facturesSnap, clientsSnap, agendaSnap] = await Promise.all([
      adminDb.collection('dossiers').where('avocatId', '==', uid).get(),
      adminDb.collection('factures').where('avocatId', '==', uid).get(),
      adminDb.collection('clients').where('createdBy', '==', uid).get(),
      adminDb.collection('agenda').where('avocatId', '==', uid).get(),
    ]);

    // 1. Dossiers with échéance in next 7 days
    for (const doc of dossiersSnap.docs) {
      const d = doc.data();
      if (d.deleted) continue;
      const echeance = d.dateEcheance?.toDate?.() ?? (d.dateEcheance ? new Date(d.dateEcheance) : null);
      if (echeance && echeance > now && echeance <= in7Days) {
        const daysLeft = Math.ceil((echeance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        notifications.push({
          id: `ech-${doc.id}`,
          type: 'echeance',
          titre: `Échéance proche: ${d.titre || d.reference || 'Dossier'}`,
          message: `Ce dossier expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
          date: echeance.toISOString(),
          lien: `/dossiers/${doc.id}`,
        });
      }
    }

    // 2. Factures impayées >30 jours
    for (const doc of facturesSnap.docs) {
      const f = doc.data();
      if (f.deleted) continue;
      if (f.statut === 'impayee' || f.statut === 'envoyee') {
        const echeance = f.dateEcheance?.toDate?.() ?? (f.dateEcheance ? new Date(f.dateEcheance) : null);
        if (echeance && echeance < ago30Days) {
          notifications.push({
            id: `fac-${doc.id}`,
            type: 'facture',
            titre: `Facture impayée: ${f.reference}`,
            message: `Facture de ${f.montantTotal?.toFixed(2) ?? '0.00'} € en retard de plus de 30 jours`,
            date: echeance.toISOString(),
            lien: `/factures/${doc.id}`,
          });
        }
      }
    }

    // 3. Nouveaux clients/dossiers (last 7 days)
    for (const doc of clientsSnap.docs) {
      const c = doc.data();
      if (c.deleted) continue;
      const created = c.createdAt?.toDate?.() ?? (c.createdAt ? new Date(c.createdAt) : null);
      if (created && created > ago7Days) {
        const nom = `${c.prenom || ''} ${c.nom || ''}`.trim() || 'Nouveau client';
        notifications.push({
          id: `cli-${doc.id}`,
          type: 'nouveau',
          titre: `Nouveau client: ${nom}`,
          message: `Ajouté il y a moins de 7 jours`,
          date: created.toISOString(),
          lien: `/clients`,
        });
      }
    }

    for (const doc of dossiersSnap.docs) {
      const d = doc.data();
      if (d.deleted) continue;
      const created = d.createdAt?.toDate?.() ?? (d.createdAt ? new Date(d.createdAt) : null);
      if (created && created > ago7Days) {
        notifications.push({
          id: `dos-${doc.id}`,
          type: 'nouveau',
          titre: `Nouveau dossier: ${d.titre || d.reference || 'Sans titre'}`,
          message: `Créé il y a moins de 7 jours`,
          date: created.toISOString(),
          lien: `/dossiers/${doc.id}`,
        });
      }
    }

    // 4. Événements agenda dans les 2 prochains jours
    for (const doc of agendaSnap.docs) {
      const e = doc.data();
      if (e.deleted) continue;
      const eventDate = e.date?.toDate?.() ?? (e.date ? new Date(e.date) : null) ?? 
                        e.dateDebut?.toDate?.() ?? (e.dateDebut ? new Date(e.dateDebut) : null);
      const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      if (eventDate && eventDate > now && eventDate <= in2Days) {
        notifications.push({
          id: `evt-${doc.id}`,
          type: 'agenda',
          titre: `Événement imminent: ${e.titre || e.objet || 'Rendez-vous'}`,
          message: `Prévu le ${eventDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`,
          date: eventDate.toISOString(),
          lien: `/agenda`,
        });
      }
    }

    // Sort by date desc (most recent first)
    notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ notifications, count: notifications.length });
  } catch (err: any) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
