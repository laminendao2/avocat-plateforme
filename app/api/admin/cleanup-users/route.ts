import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-firebase';

// DELETE /api/admin/cleanup-users?uid=XMxBe5MB4dMcYg0cBj9ZngnVr1o2
export async function DELETE(req: NextRequest) {
  try {
    await verifySession();
    const uid = req.nextUrl.searchParams.get('uid');
    if (!uid) return NextResponse.json({ error: 'uid requis' }, { status: 400 });

    // Remove from Firestore users collection only (keep Firebase Auth account for portal)
    await adminDb.collection('users').doc(uid).delete();

    return NextResponse.json({ success: true, deleted: uid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
