import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { CompareItem, ProductDetail, ProductPage } from '../dto/views';
import { CompareQueryDto, ListingQueryDto, SuggestQueryDto } from './listing.dto';
import { ProductsService, SitemapData, Suggestions } from './products.service';

@ApiTags('catalog')
@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Search and browse live products. Powers category pages, search results and supplier catalogues. */
  @Get('products')
  @Public()
  // Each search is a database query; a person browsing stays far below this.
  @Throttle({ default: { ttl: 60_000, limit: 40 } })
  @ApiOkResponse({ type: ProductPage })
  list(@Query() query: ListingQueryDto): Promise<ProductPage> {
    return this.products.list(query);
  }

  /** Up to 4 live products side by side: `?slugs=a,b,c`. Unknown ones are left out. */
  @Get('products/compare')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 40 } })
  @ApiOkResponse({ type: [CompareItem] })
  compare(@Query() { slugs }: CompareQueryDto): Promise<CompareItem[]> {
    return this.products.compare(slugs);
  }

  /** A live product with full specs, breadcrumb, more from the supplier and related products. */
  @Get('products/:slug')
  @Public()
  @ApiOkResponse({ type: ProductDetail })
  detail(@Param('slug') slug: string): Promise<ProductDetail> {
    return this.products.detail(slug);
  }

  /** Every public category, product and supplier URL with its last change. Used to build sitemap.xml. */
  @Get('sitemap')
  @Public()
  @ApiOkResponse({ type: SitemapData })
  sitemap(): Promise<SitemapData> {
    return this.products.sitemap();
  }

  /** Search-box suggestions as the user types (2+ characters). */
  @Get('search/suggest')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 90 } })
  @ApiOkResponse({ type: Suggestions })
  suggest(@Query() { q }: SuggestQueryDto): Promise<Suggestions> {
    return this.products.suggest(q);
  }
}
