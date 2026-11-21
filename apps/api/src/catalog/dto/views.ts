import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType, Category, Company, CompanyStatus, Prisma, Product, ProductStatus } from '@prisma/client';

/* Response shapes shared by web and mobile. Prices are plain numbers (rupees). */

export class Spec {
  @ApiProperty({ example: 'Material' }) label: string;
  @ApiProperty({ example: 'SS304 / CF8' }) value: string;
}

export class Price {
  @ApiPropertyOptional({ nullable: true, type: Number, example: 1150 }) min: number | null;
  @ApiPropertyOptional({ nullable: true, type: Number, example: 6800 }) max: number | null;
  @ApiProperty({ example: 'Piece' }) unit: string;
}

export class CategoryRef {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
}

export class Rating {
  @ApiProperty({ example: 4.6 }) avg: number;
  @ApiProperty({ example: 29 }) count: number;
}

export class CompanySummary {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'acme-fluid-systems' }) slug: string;
  @ApiProperty() name: string;
  @ApiProperty() city: string;
  @ApiProperty() state: string;
  @ApiPropertyOptional({ nullable: true, type: String }) logoUrl: string | null;
  @ApiProperty({ enum: BusinessType, isArray: true }) businessTypes: BusinessType[];
  @ApiPropertyOptional({ nullable: true, type: Number, example: 14 }) yearsInBusiness: number | null;
  @ApiProperty({ description: 'GSTIN checked by DIGI MART' }) gstVerified: boolean;
  @ApiProperty({ description: '"DM Trusted": inspected by DIGI MART staff' }) trustSeal: boolean;
  @ApiProperty() exporter: boolean;
  @ApiPropertyOptional({ nullable: true, type: Rating }) rating: Rating | null;
  @ApiPropertyOptional({ nullable: true, type: Number, description: 'Typical hours to first reply' }) responseHours: number | null;
}

export class ProductCard {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'ss304-flanged-ball-valve-class-150-k3x9p' }) slug: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true, type: String }) summary: string | null;
  @ApiProperty({ type: Price, description: 'min and max null = "Ask for price"' }) price: Price;
  @ApiPropertyOptional({ nullable: true, type: Number }) moq: number | null;
  @ApiProperty({ type: [Spec], description: 'Up to 6 key specifications' }) specs: Spec[];
  @ApiProperty({ type: [String] }) images: string[];
  @ApiProperty({ type: CategoryRef }) category: CategoryRef;
  @ApiProperty({ type: CompanySummary }) company: CompanySummary;
}

export class Breadcrumb {
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
}

export class ProductDetail extends ProductCard {
  @ApiPropertyOptional({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ type: [Spec], description: 'All specifications' }) declare specs: Spec[];
  @ApiProperty({ type: [Breadcrumb] }) breadcrumb: Breadcrumb[];
  @ApiPropertyOptional({ nullable: true, type: Date }) publishedAt: Date | null;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [ProductCard] }) moreFromCompany: ProductCard[];
  @ApiProperty({ type: [ProductCard] }) related: ProductCard[];
}

/** A product with every specification, for side-by-side comparison. */
export class CompareItem extends ProductCard {
  @ApiProperty({ type: [Spec], description: 'All specifications' }) declare specs: Spec[];
}

export class FacetValue {
  @ApiProperty() value: string;
  @ApiProperty() count: number;
}

export class ListingFacets {
  @ApiProperty({ type: [FacetValue] }) cities: FacetValue[];
  @ApiProperty({ type: [FacetValue] }) businessTypes: FacetValue[];
}

export class ProductPage {
  @ApiProperty({ type: [ProductCard] }) items: ProductCard[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty({ type: ListingFacets }) facets: ListingFacets;
}

/** What a supplier sees about their own product (any status). */
export class OwnProduct extends ProductCard {
  @ApiProperty({ enum: ProductStatus }) status: ProductStatus;
  @ApiPropertyOptional({ nullable: true, type: String }) rejectionReason: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ type: [Spec] }) declare specs: Spec[];
  @ApiProperty() updatedAt: Date;
}

export class CompanyProfile extends CompanySummary {
  @ApiPropertyOptional({ nullable: true, type: String }) legalName: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) description: string | null;
  @ApiPropertyOptional({ nullable: true, type: Number }) yearEstablished: number | null;
  @ApiPropertyOptional({ nullable: true, type: String }) website: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) addressLine: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) pincode: string | null;
  @ApiProperty({ type: [String] }) exportsTo: string[];
  @ApiProperty() productCount: number;
  @ApiProperty({ type: [CategoryRef], description: 'Categories this supplier lists products in' }) categories: CategoryRef[];
}

/** A supplier's own company, including private fields and moderation state. */
export class OwnCompany extends CompanyProfile {
  @ApiProperty({ enum: CompanyStatus }) status: CompanyStatus;
  @ApiPropertyOptional({ nullable: true, type: String }) gstin: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) phone: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) email: string | null;
}

/* ───────────── Mappers ───────────── */

const num = (d: Prisma.Decimal | null | undefined) => (d == null ? null : Number(d));

export function toSpecs(json: Prisma.JsonValue, limit?: number): Spec[] {
  const arr = Array.isArray(json) ? json : [];
  const specs = arr
    .filter((s): s is { label: string; value: string } => !!s && typeof s === 'object' && 'label' in s && 'value' in s)
    .map((s) => ({ label: String(s.label), value: String(s.value) }));
  return limit ? specs.slice(0, limit) : specs;
}

export function toCompanySummary(c: Company): CompanySummary {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    city: c.city,
    state: c.state,
    logoUrl: c.logoUrl,
    businessTypes: c.businessTypes,
    yearsInBusiness: c.yearEstablished ? Math.max(0, new Date().getFullYear() - c.yearEstablished) : null,
    gstVerified: !!c.gstVerifiedAt,
    trustSeal: c.trustSeal,
    exporter: c.businessTypes.includes(BusinessType.EXPORTER) || c.exportsTo.length > 0,
    rating: c.ratingAvg != null && c.ratingCount > 0 ? { avg: Number(c.ratingAvg), count: c.ratingCount } : null,
    responseHours: c.responseHours,
  };
}

export type ProductWithRefs = Product & { company: Company; category: Category };

export function toProductCard(p: ProductWithRefs): ProductCard {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    summary: p.summary,
    price: { min: num(p.priceMin), max: num(p.priceMax), unit: p.priceUnit },
    moq: p.moq,
    specs: toSpecs(p.specs, 6),
    images: p.images,
    category: { id: p.category.id, name: p.category.name, slug: p.category.slug },
    company: toCompanySummary(p.company),
  };
}

export function toOwnProduct(p: ProductWithRefs): OwnProduct {
  return {
    ...toProductCard(p),
    specs: toSpecs(p.specs),
    description: p.description,
    status: p.status,
    rejectionReason: p.rejectionReason,
    updatedAt: p.updatedAt,
  };
}
