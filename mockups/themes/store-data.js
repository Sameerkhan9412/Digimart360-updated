/* ==========================================================================
   DIGI MART 360 · Storefront theme runtime (mockup)

   ONE catalog, MANY designs. Every theme page includes this file and gets
   the same supplier + products. In development, STORE and PRODUCTS come
   from the API (GET /api/v1/storefront/resolve?host=…) instead of being
   hard-coded here. A product edited in the supplier dashboard therefore
   changes on the DIGI MART marketplace AND on the seller's own domain.

   Theme HTML stays designer-friendly:
     data-bind="companyName"        text filled from STORE / brand settings
     <template id="product-card">   one card design, cloned per product
       data-f="name|price|unit|moq|summary|icon|category|specs|link|market"
     data-products                  container the cards go into
     data-filter-bar                category chips (optional)
     data-section="hero"            homepage sections the seller can hide/reorder
     data-logo                      replaced by the seller's uploaded logo
     data-action="rfq"              adds the product to the inquiry list
   ========================================================================== */

const STORE = {
  companyName: 'Acme Fluid Systems',
  legalName: 'Acme Fluid Systems Pvt Ltd',
  initials: 'AF',
  tagline: 'Industrial valves, engineered in Pune since 2011',
  heroTitle: 'High-pressure valves for critical flow lines',
  heroText:
    'Ball, gate, check and butterfly valves for refineries, chemical plants, fertilizer complexes and water projects. Hydro-tested to API 598, dispatched with mill test certificates.',
  since: '2011',
  city: 'Pune, Maharashtra',
  address: 'Plot F-12, MIDC Bhosari, Pune 411026',
  phone: '+91 98220 12345',
  landline: '+91 20 2712 8899',
  email: 'tenders@acmeflow.com',
  gstin: '27AABCA1234F1Z5',
  domain: 'www.acmeflow.com',
  marketplaceUrl: 'digimart360.com/store/acme-fluid',
  productCount: '18',
  stats: [
    { value: '25,000', unit: 'sq ft', label: 'CNC machine shop' },
    { value: '30,000', unit: 'units / month', label: 'Production capacity' },
    { value: '18', unit: 'countries', label: 'Export destinations' },
    { value: '14', unit: 'years', label: 'In valve manufacturing' },
  ],
  certifications: [
    { code: 'ISO 9001:2015', label: 'Quality management' },
    { code: 'API 6D', label: 'Pipeline valves' },
    { code: 'CE · PED', label: 'EU pressure equipment' },
    { code: 'IBR', label: 'Indian Boiler Regulations' },
  ],
  industries: [
    'Oil & gas refineries',
    'Chemical & petrochemical',
    'Fertilizer plants',
    'Water & wastewater',
    'Thermal power',
    'Pharmaceuticals',
  ],
  exportTo: ['UAE', 'Saudi Arabia', 'Oman', 'Kenya', 'Nigeria', 'Bangladesh', 'Vietnam', 'Indonesia'],
};

const PRODUCTS = [
  {
    id: 'bv-ss304-2in', category: 'Ball valves', icon: 'ball',
    name: '2" SS304 Flanged Ball Valve',
    summary: 'Investment-cast CF8 body with PTFE seats. Full bore, lockable lever.',
    price: 2500, unit: 'piece', moq: '50 pieces',
    specs: [['Size', '½" – 4"'], ['Rating', 'Class 150'], ['Body', 'SS304 / CF8'], ['Test', 'API 598']],
  },
  {
    id: 'gv-wcb-300', category: 'Gate valves', icon: 'gate',
    name: 'Cast Steel Gate Valve, Class 300',
    summary: 'WCB body, rising stem, flexible wedge. OS&Y for pipeline isolation.',
    price: 4800, unit: 'piece', moq: '25 pieces',
    specs: [['Size', '2" – 12"'], ['Rating', 'Class 300'], ['Body', 'ASTM A216 WCB'], ['Std', 'API 600']],
  },
  {
    id: 'cv-dual-plate', category: 'Check valves', icon: 'check',
    name: 'Dual Plate Wafer Check Valve',
    summary: 'Compact non-return valve for pump discharge lines. Spring-assisted closing.',
    price: 3150, unit: 'piece', moq: '30 pieces',
    specs: [['Size', '2" – 24"'], ['Rating', 'PN 16'], ['Body', 'Ductile iron'], ['Std', 'API 594']],
  },
  {
    id: 'bf-gear-di', category: 'Butterfly valves', icon: 'butterfly',
    name: 'Gear-Operated Butterfly Valve',
    summary: 'Wafer type with EPDM liner and handwheel gearbox for large water mains.',
    price: 6900, unit: 'piece', moq: '10 pieces',
    specs: [['Size', '6" – 36"'], ['Rating', 'PN 10'], ['Disc', 'CF8M'], ['Liner', 'EPDM']],
  },
  {
    id: 'gl-a105-fs', category: 'Globe valves', icon: 'globe',
    name: 'Forged Steel Globe Valve',
    summary: 'A105 forged body, bolted bonnet, stellited trim for throttling service.',
    price: 3600, unit: 'piece', moq: '20 pieces',
    specs: [['Size', '½" – 2"'], ['Rating', 'Class 800'], ['Body', 'ASTM A105'], ['Std', 'API 602']],
  },
  {
    id: 'ys-cf8m', category: 'Strainers', icon: 'strainer',
    name: 'Y-Type Strainer, CF8M',
    summary: 'SS316 perforated screen protects pumps and meters. Blow-off plug included.',
    price: 2200, unit: 'piece', moq: '40 pieces',
    specs: [['Size', '½" – 8"'], ['Rating', 'Class 150'], ['Body', 'CF8M'], ['Mesh', '40 – 100']],
  },
];

/* Line drawings of each valve type. Stroke uses currentColor so every
   theme can tint them. Real product photos replace these in development. */
const ICONS = {
  ball: `<svg viewBox="0 0 160 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><rect x="10" y="44" width="14" height="40" rx="2"/><rect x="136" y="44" width="14" height="40" rx="2"/><path d="M24 54h22M24 74h22M114 54h22M114 74h22"/><circle cx="80" cy="64" r="34"/><circle cx="80" cy="64" r="12"/><path d="M74 30V20h12v10"/><path d="M80 20l46-8" stroke-width="6"/></svg>`,
  gate: `<svg viewBox="0 0 160 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><rect x="10" y="74" width="12" height="34" rx="2"/><rect x="138" y="74" width="12" height="34" rx="2"/><path d="M22 82h30M22 100h30M108 82h30M108 100h30"/><path d="M52 76c0-8 8-14 28-14s28 6 28 14v32H52z"/><path d="M66 62V40h28v22"/><path d="M80 40V18"/><ellipse cx="80" cy="16" rx="30" ry="6"/><path d="M52 16h56M80 10v12"/></svg>`,
  check: `<svg viewBox="0 0 160 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><circle cx="80" cy="62" r="46"/><circle cx="80" cy="62" r="34"/><path d="M80 28v68"/><path d="M80 34c-14 4-24 14-26 28 2 14 12 24 26 28"/><path d="M80 34c14 4 24 14 26 28-2 14-12 24-26 28"/><circle cx="80" cy="62" r="4"/><path d="M44 18l8 8M116 18l-8 8"/></svg>`,
  butterfly: `<svg viewBox="0 -10 160 130" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><circle cx="70" cy="70" r="40"/><ellipse cx="70" cy="70" rx="10" ry="32"/><path d="M70 30V14"/><rect x="56" y="4" width="28" height="12" rx="2"/><path d="M84 10h30"/><circle cx="130" cy="10" r="14"/><path d="M130 -4v28M116 10h28"/><path d="M30 70H16M110 70h14"/></svg>`,
  globe: `<svg viewBox="0 0 160 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><rect x="10" y="70" width="12" height="34" rx="2"/><rect x="138" y="70" width="12" height="34" rx="2"/><path d="M22 78h24M22 96h24M114 78h24M114 96h24"/><ellipse cx="80" cy="87" rx="36" ry="24"/><path d="M58 87c8-10 36-10 44 0"/><path d="M68 63V44h24v19"/><path d="M80 44V22"/><circle cx="80" cy="18" r="16"/><path d="M80 2v32M64 18h32"/></svg>`,
  strainer: `<svg viewBox="0 0 160 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><rect x="8" y="22" width="12" height="36" rx="2"/><rect x="140" y="22" width="12" height="36" rx="2"/><path d="M20 30h120M20 50h120"/><path d="M62 50l30 46M92 50l26 34"/><path d="M92 96l26-12"/><rect x="96" y="90" width="22" height="12" rx="2" transform="rotate(-25 107 96)"/><path d="M70 62l20 30M80 58l18 28" stroke-dasharray="3 5"/></svg>`,
};

/* Font pairs a seller can choose in Theme Studio. null = the theme's own. */
const FONT_PAIRS = {
  industrial: { label: 'Industrial', display: '"Barlow Condensed", "Arial Narrow", sans-serif', body: '"Barlow", "Segoe UI", sans-serif', family: 'Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600' },
  corporate: { label: 'Corporate', display: '"Manrope", "Segoe UI", sans-serif', body: '"Source Sans 3", "Segoe UI", sans-serif', family: 'Manrope:wght@600;700;800&family=Source+Sans+3:wght@400;600' },
  classic: { label: 'Classic', display: '"Cormorant Garamond", Georgia, serif', body: '"Mulish", "Segoe UI", sans-serif', family: 'Cormorant+Garamond:wght@500;600;700&family=Mulish:wght@400;600;700' },
  modern: { label: 'Modern', display: '"Sora", "Segoe UI", sans-serif', body: '"DM Sans", "Segoe UI", sans-serif', family: 'Sora:wght@600;700;800&family=DM+Sans:wght@400;500;700' },
};

const DM360 = (() => {
  const inr = (n) => '₹' + n.toLocaleString('en-IN');
  const state = { brand: {}, rfq: new Set(), filter: 'All' };

  function bindText() {
    const src = { ...STORE, ...state.brand };
    document.querySelectorAll('[data-bind]').forEach((el) => {
      const v = src[el.dataset.bind];
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll('[data-list]').forEach((el) => {
      const list = STORE[el.dataset.list];
      const tpl = el.querySelector('template');
      if (!list || !tpl) return;
      el.querySelectorAll(':scope > :not(template)').forEach((n) => n.remove());
      list.forEach((item) => {
        const node = tpl.content.firstElementChild.cloneNode(true);
        const fill = (sel, val) => node.querySelectorAll(sel).forEach((n) => (n.textContent = val));
        if (typeof item === 'string') fill('[data-i]', item);
        else Object.entries(item).forEach(([k, v]) => fill(`[data-i="${k}"]`, v));
        if (!node.querySelector('[data-i]') && typeof item === 'string') node.textContent = item;
        el.append(node);
      });
    });
  }

  function renderProducts() {
    const tpl = document.getElementById('product-card');
    const grid = document.querySelector('[data-products]');
    if (!tpl || !grid) return;
    grid.replaceChildren();
    PRODUCTS.forEach((p, i) => {
      const card = tpl.content.firstElementChild.cloneNode(true);
      card.dataset.category = p.category;
      card.dataset.index = String(i + 1).padStart(2, '0');
      const set = (f, fn) => card.querySelectorAll(`[data-f="${f}"]`).forEach(fn);
      set('name', (n) => (n.textContent = p.name));
      set('summary', (n) => (n.textContent = p.summary));
      set('category', (n) => (n.textContent = p.category));
      set('price', (n) => (n.textContent = inr(p.price)));
      set('unit', (n) => (n.textContent = '/ ' + p.unit));
      set('moq', (n) => (n.textContent = 'MOQ ' + p.moq));
      set('index', (n) => (n.textContent = card.dataset.index));
      set('icon', (n) => (n.innerHTML = ICONS[p.icon]));
      set('link', (n) => n.setAttribute('href', '../product-detail.html'));
      set('specs', (n) => {
        n.replaceChildren(
          ...p.specs.map(([k, v]) => {
            const row = document.createElement('div');
            const dt = document.createElement('dt');
            const dd = document.createElement('dd');
            dt.textContent = k;
            dd.textContent = v;
            row.append(dt, dd);
            return row;
          }),
        );
      });
      set('market', (n) => (n.title = `Same listing on ${STORE.marketplaceUrl}`));
      card.querySelectorAll('[data-action="rfq"]').forEach((b) => {
        b.dataset.id = p.id;
        b.addEventListener('click', () => toggleRfq(p.id, b));
      });
      grid.append(card);
    });
    applyFilter();
  }

  function renderFilters() {
    const bar = document.querySelector('[data-filter-bar]');
    if (!bar) return;
    const cats = ['All', ...new Set(PRODUCTS.map((p) => p.category))];
    bar.replaceChildren(
      ...cats.map((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = c;
        b.setAttribute('aria-pressed', String(c === state.filter));
        b.addEventListener('click', () => {
          state.filter = c;
          bar.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          applyFilter();
        });
        return b;
      }),
    );
  }

  function applyFilter() {
    document.querySelectorAll('[data-products] > *').forEach((card) => {
      card.hidden = state.filter !== 'All' && card.dataset.category !== state.filter;
    });
  }

  function toggleRfq(id, btn) {
    state.rfq.has(id) ? state.rfq.delete(id) : state.rfq.add(id);
    const on = state.rfq.has(id);
    btn.setAttribute('aria-pressed', String(on));
    if (btn.dataset.labelOn) btn.textContent = on ? btn.dataset.labelOn : btn.dataset.labelOff;
    document.querySelectorAll('[data-rfq-count]').forEach((n) => (n.textContent = state.rfq.size));
    document.querySelectorAll('[data-rfq-tray]').forEach((n) => (n.hidden = state.rfq.size === 0));
  }

  /* Brand settings from Theme Studio:
     { primary, accent, fontPair, logo (data URL), companyName, tagline,
       heroTitle, heroText, sections: [{id, visible}] in display order } */
  function applyBrand(b = {}) {
    state.brand = Object.fromEntries(Object.entries(b).filter(([, v]) => v !== '' && v != null));
    const root = document.documentElement.style;
    b.primary ? root.setProperty('--primary', b.primary) : root.removeProperty('--primary');
    b.accent ? root.setProperty('--accent', b.accent) : root.removeProperty('--accent');

    const pair = FONT_PAIRS[b.fontPair];
    if (pair) {
      let link = document.getElementById('dm360-font');
      if (!link) {
        link = document.createElement('link');
        link.id = 'dm360-font';
        link.rel = 'stylesheet';
        document.head.append(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${pair.family}&display=swap`;
      root.setProperty('--font-display', pair.display);
      root.setProperty('--font-body', pair.body);
    } else {
      root.removeProperty('--font-display');
      root.removeProperty('--font-body');
    }

    document.querySelectorAll('[data-logo]').forEach((slot) => {
      if (b.logo) {
        const img = document.createElement('img');
        img.src = b.logo;
        img.alt = (b.companyName || STORE.companyName) + ' logo';
        slot.replaceChildren(img);
        slot.classList.add('has-image');
      } else {
        slot.textContent = STORE.initials;
        slot.classList.remove('has-image');
      }
    });

    if (Array.isArray(b.sections)) {
      const main = document.querySelector('[data-sections]');
      b.sections.forEach(({ id, visible }) => {
        const sec = main && main.querySelector(`:scope > [data-section="${id}"]`);
        if (!sec) return;
        sec.hidden = !visible;
        main.append(sec);
      });
    }
    bindText();
  }

  function init() {
    bindText();
    renderFilters();
    renderProducts();
    document.querySelectorAll('[data-logo]').forEach((s) => (s.textContent = STORE.initials));
    document.querySelectorAll('[data-year]').forEach((s) => (s.textContent = new Date().getFullYear()));
    document.querySelectorAll('form[data-inquiry]').forEach((f) =>
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const note = f.querySelector('[data-sent]');
        if (note) note.hidden = false;
        f.reset();
      }),
    );
    // Theme Studio sends brand settings into the preview frame.
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'dm360:brand') applyBrand(e.data.brand);
    });
    if (window.parent !== window) window.parent.postMessage({ type: 'dm360:ready' }, '*');
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
  return { applyBrand, STORE, PRODUCTS, ICONS, FONT_PAIRS };
})();
