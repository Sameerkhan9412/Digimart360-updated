/* DIGI MART 360 · Marketplace v2 shared behaviour (mockup)
   - "All Categories" mega menu (data below; comes from the categories API later)
   - "Get Best Price" lead popup on any [data-gbp] button
   - "View Number" reveal on any [data-phone] button
   - Single-select chip groups: [data-chips] */

const CATEGORIES = [
  { icon: '⚙️', name: 'Industrial Machinery', groups: [
    { t: 'Valves & Fittings', items: ['Ball Valves', 'Gate Valves', 'Butterfly Valves', 'Check Valves', 'Pipe Fittings'] },
    { t: 'Pumps & Motors', items: ['Centrifugal Pumps', 'Submersible Pumps', 'Induction Motors', 'Gear Motors'] },
    { t: 'CNC & Machine Tools', items: ['CNC Lathes', 'VMC Machines', 'Milling Machines', 'Drill Machines'] },
    { t: 'Packaging Machines', items: ['Pouch Packing', 'Shrink Wrapping', 'Carton Sealers', 'Labelling Machines'] },
    { t: 'Compressors', items: ['Screw Compressors', 'Reciprocating', 'Air Dryers', 'Receivers'] },
  ] },
  { icon: '⚡', name: 'Electrical & Electronics', groups: [
    { t: 'Switchgear', items: ['MCB & RCCB', 'Panels', 'Contactors', 'Busbars'] },
    { t: 'Cables & Wires', items: ['Power Cables', 'Control Cables', 'Solar Cables', 'House Wires'] },
    { t: 'Lighting', items: ['LED Street Lights', 'High Bay Lights', 'Flood Lights', 'Panel Lights'] },
    { t: 'Solar', items: ['Solar Panels', 'Inverters', 'Mounting Structures', 'Batteries'] },
  ] },
  { icon: '🏗️', name: 'Building & Construction', groups: [
    { t: 'Steel', items: ['TMT Bars', 'MS Pipes', 'Structural Steel', 'Chequered Plates'] },
    { t: 'Cement & Blocks', items: ['OPC Cement', 'AAC Blocks', 'Fly Ash Bricks', 'Paver Blocks'] },
    { t: 'Sanitaryware', items: ['Wash Basins', 'Faucets', 'Water Closets', 'Shower Panels'] },
    { t: 'Roofing', items: ['GI Sheets', 'Polycarbonate Sheets', 'Roof Tiles'] },
  ] },
  { icon: '🧪', name: 'Chemicals & Dyes', groups: [
    { t: 'Industrial Chemicals', items: ['Caustic Soda', 'Sulphuric Acid', 'Hydrogen Peroxide', 'Solvents'] },
    { t: 'Dyes & Pigments', items: ['Reactive Dyes', 'Acid Dyes', 'Pigment Powder', 'Food Colours'] },
    { t: 'Water Treatment', items: ['Antiscalants', 'Coagulants', 'Biocides'] },
  ] },
  { icon: '🧵', name: 'Textiles & Apparel', groups: [
    { t: 'Fabrics', items: ['Cotton Fabric', 'Denim', 'Polyester Fabric', 'Linen'] },
    { t: 'Yarn', items: ['Cotton Yarn', 'Viscose Yarn', 'Polyester Yarn'] },
    { t: 'Garments', items: ['Men\'s Shirts', 'Kurtis', 'Uniforms', 'T-Shirts'] },
  ] },
  { icon: '🌾', name: 'Agriculture & Food', groups: [
    { t: 'Grains & Pulses', items: ['Basmati Rice', 'Wheat', 'Toor Dal', 'Chana'] },
    { t: 'Spices', items: ['Turmeric', 'Red Chilli', 'Cumin Seeds', 'Cardamom'] },
    { t: 'Farm Equipment', items: ['Tractors', 'Rotavators', 'Sprayers', 'Drip Irrigation'] },
  ] },
  { icon: '📦', name: 'Packaging Materials', groups: [
    { t: 'Boxes & Cartons', items: ['Corrugated Boxes', 'Mono Cartons', 'Pizza Boxes'] },
    { t: 'Flexible Packaging', items: ['Stand-up Pouches', 'BOPP Tapes', 'Stretch Film', 'Laminates'] },
    { t: 'Bottles & Jars', items: ['PET Bottles', 'Glass Jars', 'HDPE Containers'] },
  ] },
  { icon: '💊', name: 'Pharma & Healthcare', groups: [
    { t: 'Medical Devices', items: ['BP Monitors', 'Pulse Oximeters', 'Nebulizers'] },
    { t: 'Disposables', items: ['Surgical Gloves', 'Face Masks', 'Syringes'] },
    { t: 'APIs & Formulations', items: ['Paracetamol API', 'Tablets', 'Syrups'] },
  ] },
  { icon: '🚚', name: 'Auto Parts & Logistics', groups: [
    { t: 'Auto Components', items: ['Brake Pads', 'Clutch Plates', 'Bearings', 'Filters'] },
    { t: 'Material Handling', items: ['Hand Pallet Trucks', 'Forklifts', 'Conveyors'] },
  ] },
  { icon: '🛋️', name: 'Furniture & Home', groups: [
    { t: 'Office Furniture', items: ['Office Chairs', 'Workstations', 'Storage Cabinets'] },
    { t: 'Home Furnishing', items: ['Bedsheets', 'Curtains', 'Carpets', 'Cushion Covers'] },
  ] },
];

const MKT = (() => {
  const $ = (s, r = document) => r.querySelector(s);

  function initMega() {
    const btn = $('[data-mega-toggle]');
    const mega = $('#mega');
    if (!btn || !mega) return;
    const rail = $('.rail', mega);
    const pane = $('.pane', mega);
    const show = (i) => {
      rail.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
      const c = CATEGORIES[i];
      pane.replaceChildren(...c.groups.map((g) => {
        const div = document.createElement('div');
        div.innerHTML = `<h4><a href="category-listing.html"></a></h4><ul></ul>`;
        div.querySelector('h4 a').textContent = g.t;
        const ul = div.querySelector('ul');
        g.items.forEach((it) => {
          const li = document.createElement('li');
          li.innerHTML = '<a href="category-listing.html"></a>';
          li.firstChild.textContent = it;
          ul.append(li);
        });
        const more = document.createElement('li');
        more.innerHTML = '<a class="more" href="category-listing.html">View all →</a>';
        ul.append(more);
        return div;
      }));
    };
    rail.replaceChildren(...CATEGORIES.map((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.innerHTML = `<i aria-hidden="true">${c.icon}</i><span></span>`;
      b.querySelector('span').textContent = c.name;
      b.addEventListener('mouseenter', () => show(i));
      b.addEventListener('focus', () => show(i));
      b.addEventListener('click', () => show(i));
      return b;
    }));
    show(0);
    const set = (open) => { mega.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); set(mega.hidden); });
    document.addEventListener('click', (e) => { if (!mega.hidden && !mega.contains(e.target)) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  function initChips() {
    document.querySelectorAll('[data-chips]').forEach((group) => {
      group.addEventListener('click', (e) => {
        const b = e.target.closest('button.chip');
        if (!b) return;
        group.querySelectorAll('button.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        group.dispatchEvent(new CustomEvent('chipchange', { detail: b.dataset.value ?? b.textContent.trim(), bubbles: true }));
      });
    });
  }

  function initPhones() {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-phone]');
      if (!b || b.dataset.shown) return;
      b.dataset.shown = '1';
      b.textContent = '📞 ' + b.dataset.phone;
      b.title = 'The supplier has been told you viewed their number';
    });
  }

  /* One modal for every "Get Best Price" / "Send Inquiry" button. */
  function initLeadModal() {
    const m = document.createElement('div');
    m.className = 'modal';
    m.hidden = true;
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-labelledby', 'gbp-title');
    m.innerHTML = `
      <div class="box">
        <div class="top"><span class="thumb" id="gbp-icon"></span><div><b id="gbp-product"></b><small id="gbp-supplier"></small></div><button class="close" type="button" aria-label="Close">×</button></div>
        <form id="gbp-form">
          <h3 id="gbp-title">Get the best price from verified suppliers</h3>
          <div class="row2">
            <div class="f"><label for="gbp-qty">Quantity</label><input id="gbp-qty" inputmode="numeric" placeholder="e.g. 200" required></div>
            <div class="f"><label for="gbp-unit">Unit</label><select id="gbp-unit"><option>Piece</option><option>Set</option><option>Kg</option><option>Tonne</option><option>Box</option></select></div>
          </div>
          <div class="f"><label for="gbp-req">Requirement details <span style="color:var(--faint);font-weight:500">(optional)</span></label><textarea id="gbp-req" placeholder="Size, material, pressure class, delivery city"></textarea></div>
          <div class="f"><label for="gbp-mob">Mobile number</label><div class="phone"><span>+91</span><input id="gbp-mob" type="tel" inputmode="numeric" pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit mobile" required></div></div>
          <button class="btn btn-orange btn-lg" type="submit">Get Best Price</button>
          <p class="fine">Only suppliers matching your requirement receive your number. You will get an SMS to confirm.</p>
        </form>
        <div class="success" id="gbp-done" hidden>
          <i>✓</i><h3>Requirement sent</h3>
          <p id="gbp-done-text"></p>
          <button class="btn btn-line" type="button" data-close>Done</button>
        </div>
      </div>`;
    document.body.append(m);
    let lastBtn = null;
    const close = () => { m.hidden = true; if (lastBtn) lastBtn.focus(); };
    m.querySelector('.close').addEventListener('click', close);
    m.querySelector('[data-close]').addEventListener('click', close);
    m.addEventListener('click', (e) => { if (e.target === m) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !m.hidden) close(); });
    m.querySelector('#gbp-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const qty = m.querySelector('#gbp-qty').value;
      const unit = m.querySelector('#gbp-unit').value;
      const sup = lastBtn?.dataset.supplier;
      m.querySelector('#gbp-done-text').textContent = sup
        ? `${sup} and up to 4 similar verified suppliers will send prices for ${qty} ${unit.toLowerCase()}(s). Most reply within 2 hours.`
        : `Up to 5 verified suppliers will send prices for ${qty} ${unit.toLowerCase()}(s). Most reply within 2 hours.`;
      m.querySelector('#gbp-form').hidden = true;
      m.querySelector('#gbp-done').hidden = false;
      m.querySelector('[data-close]').focus();
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gbp]');
      if (!b) return;
      e.preventDefault();
      lastBtn = b;
      m.querySelector('#gbp-icon').textContent = b.dataset.icon || '📦';
      m.querySelector('#gbp-product').textContent = b.dataset.gbp || 'Your requirement';
      m.querySelector('#gbp-supplier').textContent = b.dataset.supplier ? 'Supplier: ' + b.dataset.supplier : 'We match you with verified suppliers';
      m.querySelector('#gbp-title').textContent = b.dataset.title || 'Get the best price from verified suppliers';
      m.querySelector('#gbp-form').hidden = false;
      m.querySelector('#gbp-done').hidden = true;
      m.querySelector('#gbp-form').reset();
      m.hidden = false;
      m.querySelector('#gbp-qty').focus();
    });
  }

  function init() { initMega(); initChips(); initPhones(); initLeadModal(); }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
  return { CATEGORIES };
})();
