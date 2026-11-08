/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';

/** Line drawings from the approved mockups. Shown until a supplier uploads photos. */
const DRAWINGS: Record<string, ReactNode> = {
  ball: (<><rect x="10" y="44" width="14" height="40" rx="2" /><rect x="136" y="44" width="14" height="40" rx="2" /><path d="M24 54h22M24 74h22M114 54h22M114 74h22" /><circle cx="80" cy="64" r="34" /><circle cx="80" cy="64" r="12" /><path d="M74 30V20h12v10" /><path d="M80 20l46-8" strokeWidth="6" /></>),
  gate: (<><rect x="10" y="74" width="12" height="34" rx="2" /><rect x="138" y="74" width="12" height="34" rx="2" /><path d="M22 82h30M22 100h30M108 82h30M108 100h30" /><path d="M52 76c0-8 8-14 28-14s28 6 28 14v32H52z" /><path d="M66 62V40h28v22" /><path d="M80 40V18" /><ellipse cx="80" cy="16" rx="30" ry="6" /><path d="M52 16h56M80 10v12" /></>),
  check: (<><circle cx="80" cy="62" r="46" /><circle cx="80" cy="62" r="34" /><path d="M80 28v68" /><path d="M80 34c-14 4-24 14-26 28 2 14 12 24 26 28" /><path d="M80 34c14 4 24 14 26 28-2 14-12 24-26 28" /><circle cx="80" cy="62" r="4" /></>),
  butterfly: (<><circle cx="70" cy="70" r="40" /><ellipse cx="70" cy="70" rx="10" ry="32" /><path d="M70 30V14" /><rect x="56" y="4" width="28" height="12" rx="2" /><path d="M84 10h30" /><circle cx="130" cy="10" r="14" /><path d="M130 -4v28M116 10h28" /><path d="M30 70H16M110 70h14" /></>),
  globe: (<><rect x="10" y="70" width="12" height="34" rx="2" /><rect x="138" y="70" width="12" height="34" rx="2" /><path d="M22 78h24M22 96h24M114 78h24M114 96h24" /><ellipse cx="80" cy="87" rx="36" ry="24" /><path d="M58 87c8-10 36-10 44 0" /><path d="M68 63V44h24v19" /><path d="M80 44V22" /><circle cx="80" cy="18" r="16" /><path d="M80 2v32M64 18h32" /></>),
  strainer: (<><rect x="8" y="22" width="12" height="36" rx="2" /><rect x="140" y="22" width="12" height="36" rx="2" /><path d="M20 30h120M20 50h120" /><path d="M62 50l30 46M92 50l26 34" /><path d="M92 96l26-12" /><path d="M70 62l20 30M80 58l18 28" strokeDasharray="3 5" /></>),
  motor: (<><rect x="30" y="30" width="80" height="60" rx="10" /><path d="M40 30v60M52 30v60M64 30v60M76 30v60M88 30v60M100 30v60" strokeWidth="1.5" /><rect x="110" y="48" width="18" height="24" rx="3" /><path d="M128 60h20" strokeWidth="6" /><path d="M36 90l-8 16h84l-8-16" /><rect x="58" y="16" width="26" height="14" rx="2" /></>),
  box: (<><path d="M30 40l50-22 50 22v56l-50 22-50-22z" /><path d="M30 40l50 22 50-22M80 62v56" /><path d="M55 29l50 22" strokeDasharray="4 4" /></>),
  grain: (<><path d="M80 112V30" /><path d="M80 44c-14-2-22-12-22-24 12 0 22 8 22 20M80 44c14-2 22-12 22-24-12 0-22 8-22 20M80 66c-14-2-22-12-22-24 12 0 22 8 22 20M80 66c14-2 22-12 22-24-12 0-22 8-22 20M80 88c-14-2-22-12-22-24 12 0 22 8 22 20M80 88c14-2 22-12 22-24-12 0-22 8-22 20" /></>),
  yarn: (<><circle cx="72" cy="66" r="40" /><path d="M40 44c20 10 44 10 64-4M34 66c26 12 54 12 76-6M42 90c20 6 40 4 58-10M56 30c-4 24 2 52 18 74M88 30c6 26 0 52-16 74" strokeWidth="2" /><path d="M110 82c14 6 22 18 26 30" /></>),
  steel: (<><path d="M24 86h112M24 66h112M24 46h112" strokeWidth="8" strokeLinecap="round" /><path d="M24 86l6-4m10 4l6-4m10 4l6-4M24 66l6-4m10 4l6-4M24 46l6-4m10 4l6-4" strokeWidth="2" /></>),
  generic: (<><rect x="34" y="24" width="92" height="72" rx="10" /><circle cx="62" cy="52" r="10" /><path d="M34 86l30-24 22 16 16-12 24 20" /></>),
};

const RULES: [RegExp, string][] = [
  [/ball valve/i, 'ball'],
  [/gate valve/i, 'gate'],
  [/check valve|non.?return|foot valve/i, 'check'],
  [/butterfly/i, 'butterfly'],
  [/globe valve/i, 'globe'],
  [/strainer|filter/i, 'strainer'],
  [/valve/i, 'ball'],
  [/motor|pump/i, 'motor'],
  [/box|carton|packag/i, 'box'],
  [/rice|wheat|grain|dal|spice/i, 'grain'],
  [/yarn|fabric|textile|cotton/i, 'yarn'],
  [/steel|tmt|pipe|shed|structur/i, 'steel'],
];

export function drawingFor(text: string): string {
  return RULES.find(([re]) => re.test(text))?.[1] ?? 'generic';
}

export function ProductVisual({
  name,
  category,
  image,
  className = 'pv',
  children,
}: {
  name: string;
  category?: string;
  image?: string;
  className?: string;
  children?: ReactNode;
}) {
  if (image) {
    return (
      <div className={className}>
        <img src={image} alt={name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        {children}
      </div>
    );
  }
  const key = drawingFor(`${name} ${category ?? ''}`);
  return (
    <div className={className}>
      <svg
        viewBox="0 -10 160 130"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        role="img"
        aria-label={`${name} (illustration)`}
      >
        {DRAWINGS[key]}
      </svg>
      {children}
    </div>
  );
}
