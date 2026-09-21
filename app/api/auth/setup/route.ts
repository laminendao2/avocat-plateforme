import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (existing.count > 0) {
    return NextResponse.json({ error: 'Déjà configuré' }, { status: 400 });
  }
  const { nom, email, password } = await req.json();
  const hash = await hashPassword(password);
  db.prepare('INSERT INTO users (nom, email, password, role) VALUES (?, ?, ?, ?)').run(nom, email, hash, 'admin');
  return NextResponse.json({ success: true });
}
