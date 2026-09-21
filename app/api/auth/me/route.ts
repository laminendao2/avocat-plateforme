import { NextRequest, NextResponse } from 'next/server';
import { verifySession, getCurrentUser } from '@/lib/auth-firebase';

export async function GET(_request: NextRequest) {
  try {
    await verifySession(); // throws if invalid
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    );
  }
}
