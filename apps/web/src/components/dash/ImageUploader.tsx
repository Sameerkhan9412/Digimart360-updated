'use client';

import { useId, useState } from 'react';

const MAX = 10;

/** Uploads photos as they are chosen. The form submits the resulting URLs as repeated "images" fields. */
export function ImageUploader({ initial }: { initial: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = useId();

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    for (const file of Array.from(files).slice(0, MAX - urls.length)) {
      const body = new FormData();
      body.set('file', file);
      try {
        const res = await fetch('/dashboard/upload', { method: 'POST', body });
        const json = await res.json();
        if (!res.ok) throw new Error(Array.isArray(json.message) ? json.message.join('; ') : json.message);
        setUrls((u) => [...u, json.url]);
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
  }

  return (
    <div className="f">
      <label htmlFor={id}>Photos <small>JPEG, PNG or WebP, up to 5 MB each · the first is the cover</small></label>
      <ul className="thumbs">
        {urls.map((u, i) => (
          <li key={u}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`Photo ${i + 1}`} />
            <input type="hidden" name="images" value={u} />
            <span>
              {i > 0 && (
                <button type="button" onClick={() => setUrls((l) => [u, ...l.filter((x) => x !== u)])}>Make cover</button>
              )}
              <button type="button" onClick={() => setUrls((l) => l.filter((x) => x !== u))}>Remove</button>
            </span>
          </li>
        ))}
      </ul>
      {urls.length < MAX && (
        <input id={id} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(e) => { void add(e.target.files); e.target.value = ''; }} />
      )}
      {busy && <p className="hint" role="status">Uploading…</p>}
      {error && <p className="notice err" role="alert">{error}</p>}
    </div>
  );
}
