/**
 * Shapes returned by the DIGI MART 360 API (/api/v1). Mirrors apps/api/src/catalog/dto/views.ts.
 * Later these will be generated from the API's OpenAPI spec into packages/api-client.
 */

export type BusinessType = 'MANUFACTURER' | 'EXPORTER' | 'WHOLESALER' | 'TRADER' | 'RETAILER' | 'SERVICE_PROVIDER';

export interface Spec { label: string; value: string }
export interface Price { min: number | null; max: number | null; unit: string }
export interface Ref { name: string; slug: string }
export interface CategoryRef extends Ref { id: string }

export interface CompanySummary {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  logoUrl: string | null;
  businessTypes: BusinessType[];
  yearsInBusiness: number | null;
  gstVerified: boolean;
  trustSeal: boolean;
  exporter: boolean;
  rating: { avg: number; count: number } | null;
  responseHours: number | null;
}

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  price: Price;
  moq: number | null;
  specs: Spec[];
  images: string[];
  category: CategoryRef;
  company: CompanySummary;
}

export interface ProductDetail extends ProductCard {
  description: string | null;
  breadcrumb: Ref[];
  publishedAt: string | null;
  updatedAt: string;
  moreFromCompany: ProductCard[];
  related: ProductCard[];
}

export interface FacetValue { value: string; count: number }

export interface ProductPage {
  items: ProductCard[];
  total: number;
  page: number;
  pageSize: number;
  facets: { cities: FacetValue[]; businessTypes: FacetValue[] };
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  productCount: number;
  children: CategoryNode[];
}

export interface CategoryPage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  seoTitle: string;
  seoDescription: string;
  productCount: number;
  breadcrumb: Ref[];
  children: CategoryNode[];
}

export interface CompanyProfile extends CompanySummary {
  legalName: string | null;
  description: string | null;
  yearEstablished: number | null;
  website: string | null;
  addressLine: string | null;
  pincode: string | null;
  exportsTo: string[];
  productCount: number;
  categories: CategoryRef[];
}

export interface Suggestions { categories: Ref[]; products: string[]; companies: Ref[] }

export interface SitemapData {
  categories: { slug: string; updatedAt: string }[];
  products: { slug: string; updatedAt: string }[];
  companies: { slug: string; updatedAt: string }[];
}

export type Sort = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating';

export interface ListingParams {
  q?: string;
  category?: string;
  city?: string;
  businessType?: BusinessType;
  minPrice?: number;
  maxPrice?: number;
  trusted?: boolean;
  gstVerified?: boolean;
  exporter?: boolean;
  company?: string;
  sort?: Sort;
  page?: number;
  pageSize?: number;
}

/* Supplier dashboard */

export type ProductStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'ARCHIVED';
export type CompanyStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface OwnProduct extends ProductCard {
  status: ProductStatus;
  rejectionReason: string | null;
  description: string | null;
  updatedAt: string;
}

export interface OwnCompany extends CompanySummary {
  status: CompanyStatus;
  legalName: string | null;
  description: string | null;
  yearEstablished: number | null;
  website: string | null;
  addressLine: string | null;
  pincode: string | null;
  exportsTo: string[];
  gstin: string | null;
  phone: string | null;
  email: string | null;
  productCount: number;
}

/* Requirements (RFQs) */

export type RfqStatus = 'OPEN' | 'AWARDED' | 'CLOSED' | 'EXPIRED';
export type QuoteStatus = 'SUBMITTED' | 'WITHDRAWN' | 'AWARDED' | 'NOT_SELECTED';

export interface Contact { name: string; email: string | null; phone: string | null }

export interface RfqSummary {
  id: string;
  number: string;
  title: string;
  category: CategoryRef;
  quantity: number;
  unit: string;
  city: string;
  state: string;
  budget: number | null;
  status: RfqStatus;
  closesAt: string;
  createdAt: string;
  quoteCount: number;
}

export interface QuoteView {
  id: string;
  unitPrice: number;
  total: number;
  deliveryDays: number;
  material: string | null;
  warranty: string | null;
  paymentTerms: string | null;
  certificates: string | null;
  note: string | null;
  validUntil: string | null;
  revision: number;
  status: QuoteStatus;
  updatedAt: string;
}

export interface BuyerQuote extends QuoteView {
  company: CompanySummary;
  isLowestPrice: boolean;
  isFastest: boolean;
  withinBudget: boolean | null;
}

export interface BuyerRfq extends RfqSummary {
  description: string | null;
  invitedCount: number;
  quotes: BuyerQuote[];
  awardedContact: Contact | null;
}

export interface SupplierRfq extends RfqSummary {
  description: string | null;
  invited: boolean;
  buyerLocation: string;
  myQuote: QuoteView | null;
  buyerContact: Contact | null;
}
