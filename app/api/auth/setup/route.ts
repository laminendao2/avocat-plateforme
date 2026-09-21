import { NextRequest, NextResponse } from 'next/server';

// Cette route n'est plus utilisée (migration vers Firebase)
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'Non implémenté - utilisez Firebase Authentication' }, { status: 501 });
}
