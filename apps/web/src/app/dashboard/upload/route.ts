import { NextResponse } from 'next/server';
import { authed } from '@/lib/dash';

/** The browser posts a photo here; we forward it to the API with the supplier's session. */
export async function POST(req: Request) {
  const incoming = await req.formData().catch(() => null);
  const file = incoming?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ message: 'Attach an image' }, { status: 400 });

  const out = new FormData();
  out.set('file', file, file.name);
  const res = await authed('/me/uploads/images', { method: 'POST', body: out });
  const body = await res.json().catch(() => ({ message: 'Upload failed' }));
  return NextResponse.json(body, { status: res.status });
}
