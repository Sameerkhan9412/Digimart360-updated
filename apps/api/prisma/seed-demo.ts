/**
 * Demo catalog for development and design review. Safe to re-run (upserts).
 *   npm run db:seed:demo -w @digimart/api
 * Everything here is fictional sample data based on the approved mockups.
 * Never run against production.
 */
import { BusinessType, CompanyStatus, PrismaClient, ProductStatus, Role } from '@prisma/client';

const prisma = new PrismaClient();
const { MANUFACTURER: MFR, EXPORTER: EXP, WHOLESALER: WHL, TRADER: TRD, RETAILER: RTL } = BusinessType;

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to load demo data with NODE_ENV=production');
  process.exit(1);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* ── Category tree (matches the "All Categories" menu in mockups/market.js) ── */
const TREE: [string, string, [string, string[]][]][] = [
  ['⚙️', 'Industrial Machinery', [
    ['Valves & Fittings', ['Ball Valves', 'Gate Valves', 'Butterfly Valves', 'Check Valves', 'Globe Valves', 'Strainers', 'Pipe Fittings']],
    ['Pumps & Motors', ['Centrifugal Pumps', 'Submersible Pumps', 'Induction Motors', 'Gear Motors']],
    ['CNC & Machine Tools', ['CNC Lathes', 'VMC Machines', 'Milling Machines', 'Drill Machines']],
    ['Packaging Machines', ['Pouch Packing Machines', 'Shrink Wrapping Machines', 'Carton Sealers', 'Labelling Machines']],
    ['Compressors', ['Screw Compressors', 'Reciprocating Compressors', 'Air Dryers', 'Air Receivers']],
  ]],
  ['⚡', 'Electrical & Electronics', [
    ['Switchgear', ['MCB & RCCB', 'Electrical Panels', 'Contactors', 'Busbars']],
    ['Cables & Wires', ['Power Cables', 'Control Cables', 'Solar Cables', 'House Wires']],
    ['Lighting', ['LED Street Lights', 'High Bay Lights', 'Flood Lights', 'Panel Lights']],
    ['Solar', ['Solar Panels', 'Solar Inverters', 'Mounting Structures', 'Solar Batteries']],
  ]],
  ['🏗️', 'Building & Construction', [
    ['Steel', ['TMT Bars', 'MS Pipes', 'Structural Steel', 'Chequered Plates']],
    ['Cement & Blocks', ['OPC Cement', 'AAC Blocks', 'Fly Ash Bricks', 'Paver Blocks']],
    ['Sanitaryware', ['Wash Basins', 'Faucets', 'Water Closets', 'Shower Panels']],
    ['Roofing', ['GI Sheets', 'Polycarbonate Sheets', 'Roof Tiles']],
  ]],
  ['🧪', 'Chemicals & Dyes', [
    ['Industrial Chemicals', ['Caustic Soda', 'Sulphuric Acid', 'Hydrogen Peroxide', 'Industrial Solvents']],
    ['Dyes & Pigments', ['Reactive Dyes', 'Acid Dyes', 'Pigment Powder', 'Food Colours']],
    ['Water Treatment Chemicals', ['Antiscalants', 'Coagulants', 'Biocides']],
  ]],
  ['🧵', 'Textiles & Apparel', [
    ['Fabrics', ['Cotton Fabric', 'Denim Fabric', 'Polyester Fabric', 'Linen Fabric']],
    ['Yarn', ['Cotton Yarn', 'Viscose Yarn', 'Polyester Yarn']],
    ['Garments', ["Men's Shirts", 'Kurtis', 'Uniforms', 'T-Shirts']],
  ]],
  ['🌾', 'Agriculture & Food', [
    ['Grains & Pulses', ['Basmati Rice', 'Wheat', 'Toor Dal', 'Chana']],
    ['Spices', ['Turmeric', 'Red Chilli', 'Cumin Seeds', 'Cardamom']],
    ['Farm Equipment', ['Tractors', 'Rotavators', 'Sprayers', 'Drip Irrigation']],
  ]],
  ['📦', 'Packaging Materials', [
    ['Boxes & Cartons', ['Corrugated Boxes', 'Mono Cartons', 'Pizza Boxes']],
    ['Flexible Packaging', ['Stand-up Pouches', 'BOPP Tapes', 'Stretch Film', 'Laminates']],
    ['Bottles & Jars', ['PET Bottles', 'Glass Jars', 'HDPE Containers']],
  ]],
  ['💊', 'Pharma & Healthcare', [
    ['Medical Devices', ['BP Monitors', 'Pulse Oximeters', 'Nebulizers']],
    ['Medical Disposables', ['Surgical Gloves', 'Face Masks', 'Syringes']],
    ['APIs & Formulations', ['Paracetamol API', 'Tablets', 'Syrups']],
  ]],
  ['🚚', 'Auto Parts & Logistics', [
    ['Auto Components', ['Brake Pads', 'Clutch Plates', 'Bearings', 'Auto Filters']],
    ['Material Handling', ['Hand Pallet Trucks', 'Forklifts', 'Conveyors']],
  ]],
  ['🛋️', 'Furniture & Home', [
    ['Office Furniture', ['Office Chairs', 'Workstations', 'Storage Cabinets']],
    ['Home Furnishing', ['Bedsheets', 'Curtains', 'Carpets', 'Cushion Covers']],
  ]],
];

/* ── Suppliers ── */
type Co = {
  slug: string; name: string; legalName: string; city: string; state: string; types: BusinessType[]; year: number;
  gstin: string; gstVerified: boolean; trust: boolean; rating: number; reviews: number; resp: number; phone: string;
  exportsTo?: string[]; description: string; address?: string; pincode?: string;
};
const COMPANIES: Co[] = [
  { slug: 'acme-fluid-systems', name: 'Acme Fluid Systems', legalName: 'Acme Fluid Systems Pvt Ltd', city: 'Pune', state: 'Maharashtra', types: [MFR, EXP], year: 2011,
    gstin: '27AABCA1234F1Z5', gstVerified: true, trust: true, rating: 4.7, reviews: 38, resp: 2, phone: '+919822012345', exportsTo: ['UAE', 'Saudi Arabia', 'Oman', 'Kenya', 'Nigeria', 'Bangladesh', 'Vietnam', 'Indonesia'],
    address: 'Plot F-12, MIDC Bhosari', pincode: '411026',
    description: 'ISO 9001:2015 certified manufacturer of industrial ball, gate, check, butterfly and globe valves. 25,000 sq ft CNC plant in Bhosari MIDC; every valve hydro-tested to API 598.' },
  { slug: 'shree-ganesh-valve-industries', name: 'Shree Ganesh Valve Industries', legalName: 'Shree Ganesh Valve Industries', city: 'Ahmedabad', state: 'Gujarat', types: [MFR, EXP], year: 2015,
    gstin: '24ABCFS5678K1Z2', gstVerified: true, trust: true, rating: 4.6, reviews: 29, resp: 3, phone: '+917940055123', exportsTo: ['UAE', 'Qatar'],
    description: 'Stainless steel screwed and flanged ball valves from Odhav GIDC, Ahmedabad.' },
  { slug: 'rajhans-flow-controls', name: 'Rajhans Flow Controls', legalName: 'Rajhans Flow Controls', city: 'Rajkot', state: 'Gujarat', types: [MFR], year: 2017,
    gstin: '24AAKFR9012L1Z8', gstVerified: true, trust: false, rating: 4.4, reviews: 51, resp: 5, phone: '+919725033410',
    description: 'Forged brass valves and plumbing fittings for water, gas and air lines.' },
  { slug: 'konkan-pipe-and-valve-traders', name: 'Konkan Pipe & Valve Traders', legalName: 'Konkan Pipe & Valve Traders LLP', city: 'Mumbai', state: 'Maharashtra', types: [WHL, EXP], year: 2004,
    gstin: '27AAPFK3456M1Z3', gstVerified: true, trust: true, rating: 4.8, reviews: 17, resp: 1, phone: '+912223877651', exportsTo: ['UAE', 'Kuwait', 'Oman'],
    description: 'Stockist of high-pressure trunnion, gate and butterfly valves for oil & gas projects.' },
  { slug: 'vadodara-pneumatics-and-controls', name: 'Vadodara Pneumatics & Controls', legalName: 'Vadodara Pneumatics & Controls Pvt Ltd', city: 'Vadodara', state: 'Gujarat', types: [MFR], year: 2019,
    gstin: '24AAECV7890N1Z4', gstVerified: true, trust: false, rating: 4.5, reviews: 12, resp: 4, phone: '+912652310984',
    description: 'Pneumatic and electric actuated valves with limit switch boxes and positioners.' },
  { slug: 'kovai-agro-valves', name: 'Kovai Agro Valves', legalName: 'Kovai Agro Valves', city: 'Coimbatore', state: 'Tamil Nadu', types: [MFR, WHL], year: 2014,
    gstin: '33AAKFK2345P1Z6', gstVerified: true, trust: true, rating: 4.3, reviews: 64, resp: 6, phone: '+914222461770',
    description: 'PVC and PP valves, filters and fittings for drip and sprinkler irrigation.' },
  { slug: 'capital-hydraulic-stores', name: 'Capital Hydraulic Stores', legalName: 'Capital Hydraulic Stores', city: 'Delhi', state: 'Delhi', types: [RTL, WHL], year: 2008,
    gstin: '07AAGFC6789Q1Z1', gstVerified: true, trust: false, rating: 4.2, reviews: 23, resp: 24, phone: '+911123509876',
    description: 'Hydraulic valves, hoses and fittings in stock for same-day dispatch across NCR.' },
  { slug: 'coromandel-marine-valves', name: 'Coromandel Marine Valves', legalName: 'Coromandel Marine Valves Pvt Ltd', city: 'Chennai', state: 'Tamil Nadu', types: [MFR, EXP], year: 2010,
    gstin: '33AADCC4567R1Z9', gstVerified: true, trust: true, rating: 4.6, reviews: 9, resp: 3, phone: '+914426188204', exportsTo: ['Singapore', 'Sri Lanka', 'UAE'],
    description: 'Bronze and gun-metal valves for shipbuilding and seawater service.' },
  { slug: 'bharat-electro-corp', name: 'Bharat Electro Corp', legalName: 'Bharat Electro Corporation', city: 'Coimbatore', state: 'Tamil Nadu', types: [MFR], year: 2007,
    gstin: '33AAFCB1122S1Z7', gstVerified: true, trust: true, rating: 4.8, reviews: 41, resp: 3, phone: '+914222557800',
    description: 'IE3 induction motors and monoblock pumps.' },
  { slug: 'horizon-packaging', name: 'Horizon Packaging', legalName: 'Horizon Packaging Industries', city: 'Bhiwandi', state: 'Maharashtra', types: [MFR], year: 2017,
    gstin: '27AAHFH3344T1Z0', gstVerified: true, trust: true, rating: 4.5, reviews: 22, resp: 4, phone: '+919890011223',
    description: 'Corrugated boxes and printed cartons for e-commerce and FMCG.' },
  { slug: 'sarthak-rice-exports', name: 'Sarthak Rice Exports', legalName: 'Sarthak Rice Exports Pvt Ltd', city: 'Karnal', state: 'Haryana', types: [MFR, EXP], year: 2003,
    gstin: '06AAICS5566U1Z5', gstVerified: true, trust: true, rating: 4.7, reviews: 33, resp: 2, phone: '+911842266700', exportsTo: ['UAE', 'Saudi Arabia', 'UK', 'USA'],
    description: 'Basmati and non-basmati rice millers and exporters.' },
  { slug: 'kaveri-textiles', name: 'Kaveri Textiles', legalName: 'Kaveri Textiles', city: 'Tiruppur', state: 'Tamil Nadu', types: [MFR, EXP], year: 2010,
    gstin: '33AAFFK7788V1Z2', gstVerified: true, trust: true, rating: 4.6, reviews: 27, resp: 3, phone: '+914212244500', exportsTo: ['Bangladesh', 'Germany'],
    description: 'Combed cotton yarn and knitted fabric.' },
  // Waiting for admin approval: shows up in the moderation queue, not in public listings.
  { slug: 'nashik-steel-fabricators', name: 'Nashik Steel Fabricators', legalName: 'Nashik Steel Fabricators', city: 'Nashik', state: 'Maharashtra', types: [MFR, TRD], year: 2021,
    gstin: '27AAKFN9900W1Z3', gstVerified: false, trust: false, rating: 0, reviews: 0, resp: 8, phone: '+919850099001',
    description: 'Structural steel fabrication and sheds.' },
];

/* ── Products: [companySlug, categoryName, name, summary, min, max, unit, moq, specs] ── */
type P = [string, string, string, string, number | null, number | null, string, number | null, [string, string][]];
const PRODUCTS: P[] = [
  ['acme-fluid-systems', 'Ball Valves', '2" SS304 Flanged Ball Valve, Class 150', 'Investment-cast CF8 body with PTFE seats. Full bore, lockable lever.', 2500, 2500, 'Piece', 50,
    [['Material', 'SS304 / CF8'], ['Size', '½" – 4"'], ['Pressure', 'Class 150'], ['End', 'Flanged RF'], ['Operation', 'Lever, lockable'], ['Test', 'API 598']]],
  ['acme-fluid-systems', 'Gate Valves', 'Cast Steel Gate Valve, Class 300', 'WCB body, rising stem, flexible wedge. OS&Y for pipeline isolation.', 4800, 4800, 'Piece', 25,
    [['Material', 'ASTM A216 WCB'], ['Size', '2" – 12"'], ['Pressure', 'Class 300'], ['Standard', 'API 600']]],
  ['acme-fluid-systems', 'Check Valves', 'Dual Plate Wafer Check Valve', 'Compact non-return valve for pump discharge lines. Spring-assisted closing.', 3150, 3150, 'Piece', 30,
    [['Body', 'Ductile iron'], ['Size', '2" – 24"'], ['Pressure', 'PN 16'], ['Standard', 'API 594']]],
  ['acme-fluid-systems', 'Butterfly Valves', 'Gear-Operated Butterfly Valve', 'Wafer type with EPDM liner and handwheel gearbox for large water mains.', 6900, 6900, 'Piece', 10,
    [['Disc', 'CF8M'], ['Size', '6" – 36"'], ['Pressure', 'PN 10'], ['Liner', 'EPDM']]],
  ['acme-fluid-systems', 'Globe Valves', 'Forged Steel Globe Valve, Class 800', 'A105 forged body, bolted bonnet, stellited trim for throttling service.', 3600, 3600, 'Piece', 20,
    [['Body', 'ASTM A105'], ['Size', '½" – 2"'], ['Pressure', 'Class 800'], ['Standard', 'API 602']]],
  ['acme-fluid-systems', 'Strainers', 'Y-Type Strainer, CF8M', 'SS316 perforated screen protects pumps and meters. Blow-off plug included.', 2200, 2200, 'Piece', 40,
    [['Body', 'CF8M'], ['Size', '½" – 8"'], ['Pressure', 'Class 150'], ['Mesh', '40 – 100']]],
  ['shree-ganesh-valve-industries', 'Ball Valves', '3 Piece Screwed End Ball Valve, SS316', 'Full bore, PTFE seats, BSP or NPT threads.', 1150, 6800, 'Piece', 20,
    [['Material', 'SS316 / CF8M'], ['Size', '¼" – 2"'], ['Pressure', '1000 WOG'], ['End', 'BSP / NPT screwed'], ['Bore', 'Full bore'], ['Seat', 'PTFE']]],
  ['shree-ganesh-valve-industries', 'Ball Valves', '2 Piece SS Ball Valve', 'Economical two-piece design for utility lines.', 890, 3200, 'Piece', 50,
    [['Material', 'SS304'], ['Size', '½" – 2"'], ['End', 'Screwed']]],
  ['rajhans-flow-controls', 'Ball Valves', 'Forged Brass Ball Valve, Lever Handle', 'Nickel-plated forged brass for water, gas and air.', 180, 1450, 'Piece', 100,
    [['Material', 'Forged brass CW617N'], ['Size', '½" – 2"'], ['Pressure', 'PN 25'], ['End', 'BSP female'], ['Finish', 'Nickel plated'], ['Use', 'Water, gas, air']]],
  ['rajhans-flow-controls', 'Check Valves', 'Brass Spring Check Valve', 'Vertical or horizontal mounting.', 160, 980, 'Piece', 100,
    [['Material', 'Brass'], ['Size', '½" – 2"']]],
  ['konkan-pipe-and-valve-traders', 'Ball Valves', 'Trunnion Mounted Ball Valve, Class 600', 'For oil & gas pipelines. Gear or actuator operated.', 38000, 240000, 'Piece', 2,
    [['Material', 'ASTM A216 WCB'], ['Size', '2" – 24"'], ['Pressure', 'Class 600'], ['End', 'Flanged RTJ'], ['Standard', 'API 6D'], ['Operation', 'Gear / actuator']]],
  ['konkan-pipe-and-valve-traders', 'Gate Valves', 'Through Conduit Gate Valve', 'Slab gate design for piggable pipelines.', 62000, 310000, 'Piece', 1,
    [['Standard', 'API 6D'], ['Pressure', 'Class 300 – 900']]],
  ['vadodara-pneumatics-and-controls', 'Ball Valves', 'Pneumatic Actuated Ball Valve, Double Acting', 'Aluminium actuator, ISO 5211 mounting, optional limit switch box.', 9800, 46000, 'Piece', 5,
    [['Material', 'SS304 body'], ['Size', '½" – 6"'], ['Actuator', 'Aluminium, double acting'], ['Air supply', '4 – 7 bar'], ['Mounting', 'ISO 5211'], ['Option', 'Limit switch box']]],
  ['vadodara-pneumatics-and-controls', 'Butterfly Valves', 'Pneumatic Butterfly Valve', 'Wafer butterfly with spring-return actuator.', 12400, 58000, 'Piece', 5,
    [['Size', '2" – 12"'], ['Actuator', 'Spring return']]],
  ['kovai-agro-valves', 'Ball Valves', 'PVC Ball Valve for Drip Irrigation', 'UPVC solvent-socket valve for farm water lines.', 45, 420, 'Piece', 500,
    [['Material', 'UPVC'], ['Size', '½" – 4"'], ['Pressure', '6 kg/cm²'], ['End', 'Solvent socket'], ['Colour', 'Grey / blue'], ['Use', 'Irrigation, water lines']]],
  ['kovai-agro-valves', 'Drip Irrigation', 'Disc Filter 2"', '120-mesh disc filter for drip systems.', 1150, 1150, 'Piece', 20,
    [['Size', '2"'], ['Mesh', '120']]],
  ['capital-hydraulic-stores', 'Ball Valves', 'High Pressure Hydraulic Ball Valve', 'Zinc-plated carbon steel, rated 500 bar.', 650, 3900, 'Piece', 10,
    [['Material', 'Carbon steel, zinc plated'], ['Size', '¼" – 1½"'], ['Pressure', '500 bar'], ['End', 'BSP / NPT'], ['Seat', 'POM'], ['Use', 'Hydraulic lines']]],
  ['coromandel-marine-valves', 'Ball Valves', 'Marine Bronze Ball Valve, Flanged', 'Gun-metal body for seawater lines; IRS approval on request.', 2900, 18500, 'Piece', 10,
    [['Material', 'Gun-metal / bronze'], ['Size', '1" – 6"'], ['Pressure', 'PN 16'], ['End', 'JIS / ANSI flanged'], ['Approval', 'IRS on request'], ['Use', 'Seawater lines']]],
  ['coromandel-marine-valves', 'Globe Valves', 'Bronze Globe Valve', 'Screw-down globe valve for marine service.', 3600, 14000, 'Piece', 10,
    [['Material', 'Bronze'], ['Size', '½" – 4"']]],
  ['bharat-electro-corp', 'Induction Motors', 'Three-Phase 15 HP Induction Motor, IE3', 'Copper winding, foot mounted, IP55.', 18400, 18400, 'Piece', 5,
    [['Power', '15 HP / 11 kW'], ['Efficiency', 'IE3'], ['Speed', '1440 RPM'], ['Protection', 'IP55']]],
  ['bharat-electro-corp', 'Centrifugal Pumps', 'Monoblock Centrifugal Pump 5 HP', 'Cast iron body for agriculture and building water supply.', 14500, 14500, 'Piece', 5,
    [['Power', '5 HP'], ['Head', '25 – 45 m']]],
  ['horizon-packaging', 'Corrugated Boxes', '5-Ply Corrugated Shipping Box', 'Custom logo print, 18×12×10 in.', 42, 42, 'Box', 1000,
    [['Ply', '5'], ['Size', '18 × 12 × 10 in'], ['Print', 'Up to 2 colours']]],
  ['horizon-packaging', 'Mono Cartons', 'Printed Mono Carton', 'Offset printed duplex board cartons.', 6, 18, 'Piece', 5000,
    [['Board', '300 GSM duplex'], ['Print', '4 colour']]],
  ['sarthak-rice-exports', 'Basmati Rice', '1121 Sella Basmati Rice', 'Extra-long grain, export quality.', 92, 98, 'Kg', 25000,
    [['Grain length', '8.35 mm'], ['Moisture', '12% max'], ['Broken', '1% max']]],
  ['kaveri-textiles', 'Cotton Yarn', '30s Combed Cotton Yarn', 'Compact yarn for knitting.', 265, 280, 'Kg', 1000,
    [['Count', '30s Ne'], ['Type', 'Combed compact']]],
  ['nashik-steel-fabricators', 'Structural Steel', 'Pre-Engineered Steel Shed', 'Design, fabrication and erection.', 1800, 2600, 'Sq ft', 2000,
    [['Material', 'IS 2062 E250']]],
];

async function main() {
  // Categories
  const ids = new Map<string, string>();
  const upsertCat = async (name: string, parentId: string | null, sortOrder: number, icon?: string) => {
    let slug = slugify(name);
    const clash = await prisma.category.findUnique({ where: { slug } });
    if (clash && clash.parentId !== parentId) slug = `${slug}-${slugify(String(parentId ? [...ids.entries()].find(([, v]) => v === parentId)?.[0] : 'x'))}`;
    const c = await prisma.category.upsert({
      where: { slug },
      update: { name, parentId, sortOrder, icon },
      create: { name, slug, parentId, sortOrder, icon },
    });
    ids.set(name, c.id);
    return c.id;
  };
  for (const [gi, [icon, group, cats]] of TREE.entries()) {
    const gid = await upsertCat(group, null, gi, icon);
    for (const [ci, [cat, leaves]] of cats.entries()) {
      const cid = await upsertCat(cat, gid, ci);
      for (const [li, leaf] of leaves.entries()) await upsertCat(leaf, cid, li);
    }
  }

  // Companies and their owners
  const companyIds = new Map<string, { id: string; status: CompanyStatus }>();
  for (const c of COMPANIES) {
    const email = `owner@${c.slug}.demo.digimart360.local`;
    const owner = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: `${c.name} (owner)`, role: Role.SUPPLIER, emailVerifiedAt: new Date() },
    });
    const status = c.gstVerified ? CompanyStatus.ACTIVE : CompanyStatus.PENDING;
    const data = {
      name: c.name, legalName: c.legalName, city: c.city, state: c.state, businessTypes: c.types, yearEstablished: c.year,
      gstin: c.gstin, gstVerifiedAt: c.gstVerified ? new Date('2026-01-15') : null, trustSeal: c.trust,
      ratingAvg: c.reviews ? c.rating : null, ratingCount: c.reviews, responseHours: c.resp, phone: c.phone,
      exportsTo: c.exportsTo ?? [], description: c.description, addressLine: c.address, pincode: c.pincode, status,
    };
    const company = await prisma.company.upsert({
      where: { slug: c.slug },
      update: data,
      create: { ...data, slug: c.slug, ownerId: owner.id },
    });
    companyIds.set(c.slug, { id: company.id, status });
  }

  // Products (fixed slugs so re-runs update instead of duplicating)
  let n = 0;
  for (const [co, cat, name, summary, min, max, unit, moq, specs] of PRODUCTS) {
    const company = companyIds.get(co)!;
    const categoryId = ids.get(cat);
    if (!categoryId) throw new Error(`Unknown category "${cat}" for ${name}`);
    const slug = `${slugify(name).slice(0, 60)}-${co.slice(0, 4)}`;
    const status = company.status === CompanyStatus.ACTIVE ? ProductStatus.ACTIVE : ProductStatus.PENDING_REVIEW;
    const data = {
      name, summary, priceMin: min, priceMax: max, priceUnit: unit, moq, categoryId, status,
      specs: specs.map(([label, value]) => ({ label, value })),
      publishedAt: status === ProductStatus.ACTIVE ? new Date(Date.now() - n * 3600_000) : null,
    };
    await prisma.product.upsert({ where: { slug }, update: data, create: { ...data, slug, companyId: company.id } });
    n++;
  }

  console.log(`Demo catalog ready: ${ids.size} categories, ${COMPANIES.length} suppliers, ${PRODUCTS.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
