'use client';

import { useActionState } from 'react';
import { saveSite, type FormState } from '@/app/dashboard/actions';
import { ImageUploader } from '@/components/dash/ImageUploader';
import type { StorefrontSettings, StorefrontTheme } from '@/lib/types';

const THEMES: { id: StorefrontTheme; name: string; about: string; swatch: string[] }[] = [
  { id: 'MERIDIAN', name: 'Meridian', about: 'Clean and corporate. Good for any business.', swatch: ['#183b63', '#0f8f7e', '#ffffff'] },
  { id: 'BAZAAR', name: 'Bazaar', about: 'Friendly and rounded. Good for traders and retailers.', swatch: ['#1b8c4e', '#f08a24', '#f6f7f9'] },
  { id: 'FORGE', name: 'Forge', about: 'Dark and industrial. Good for manufacturers and heavy engineering.', swatch: ['#f26b1d', '#ffc23d', '#121518'] },
  { id: 'HERITAGE', name: 'Heritage', about: 'Classic serif style. Good for long-established firms.', swatch: ['#232a5c', '#b7832b', '#f2f1ec'] },
];

export function WebsiteForm({ settings: s }: { settings: StorefrontSettings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSite, {});
  return (
    <form action={action} className="dform panel">
      <fieldset className="f">
        <legend>Look</legend>
        <div className="themes">
          {THEMES.map((t) => (
            <label key={t.id} className="theme">
              <input type="radio" name="theme" value={t.id} defaultChecked={s.theme === t.id} />
              <span className="sw" aria-hidden="true">{t.swatch.map((c) => <i key={c} style={{ background: c }} />)}</span>
              <b>{t.name}</b>
              <small>{t.about}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="row2">
        <div className="f">
          <label htmlFor="accent">Brand colour</label>
          <input id="accent" name="accent" type="color" defaultValue={s.accent ?? '#183b63'} />
          <label className="check"><input type="checkbox" name="useThemeColour" defaultChecked={!s.accent} /> Use the theme&apos;s own colour</label>
        </div>
        <div className="f">
          <label htmlFor="tagline">Headline <small>shown big at the top of your website</small></label>
          <input id="tagline" name="tagline" maxLength={120} defaultValue={s.tagline ?? ''} placeholder="Precision valves since 1998" />
        </div>
      </div>

      <ImageUploader initial={s.bannerUrl ? [s.bannerUrl] : []} name="banner" max={1} label="Banner photo" hint="optional · wide photo behind your headline · JPEG, PNG or WebP, up to 5 MB" />

      <fieldset className="f">
        <legend>Sections to show</legend>
        <div className="chips-wrap">
          <label className="check"><input type="checkbox" name="showAbout" defaultChecked={s.showAbout} /> About us</label>
          <label className="check"><input type="checkbox" name="showProducts" defaultChecked={s.showProducts} /> Products</label>
          <label className="check"><input type="checkbox" name="showCertificates" defaultChecked={s.showCertificates} /> Certifications</label>
          <label className="check"><input type="checkbox" name="showContact" defaultChecked={s.showContact} /> Contact</label>
        </div>
      </fieldset>

      <div className="f">
        <label htmlFor="certificates">Certifications <small>one per line, up to 10</small></label>
        <textarea id="certificates" name="certificates" rows={4} defaultValue={s.certificates.join('\n')} placeholder={'ISO 9001:2015\nCE marking'} />
      </div>

      {state.error && <p className="notice err" role="alert">{state.error}</p>}
      {state.saved && <p className="notice ok" role="status">Saved. Your website is updated.</p>}
      <div><button className="btn btn-orange btn-lg" disabled={pending}>{pending ? 'Saving…' : 'Save website'}</button></div>
    </form>
  );
}
