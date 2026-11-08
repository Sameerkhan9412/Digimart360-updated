import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ProductDetail, ProductPage } from '../dto/views';
import { ListingQueryDto, SuggestQueryDto } from './listing.dto';
import { ProductsService, Suggestions } from './products.service';

@ApiTags('catalog')
@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Search and browse live products. Powers category pages, search results and supplier catalogues. */
  @Get('products')
  @Public()
  @ApiOkResponse({ type: ProductPage })
  list(@Query() query: ListingQueryDto): Promise<ProductPage> {
    return this.products.list(query);
  }

  /** A live product with full specs, breadcrumb, more from the supplier and related products. */
  @Get('products/:slug')
  @Public()
  @ApiOkResponse({ type: ProductDetail })
  detail(@Param('slug') slug: string): Promise<ProductDetail> {
    return this.products.detail(slug);
  }

  /** Search-box suggestions as the user types (2+ characters). */
  @Get('search/suggest')
  @Public()
  @ApiOkResponse({ type: Suggestions })
  suggest(@Query() { q }: SuggestQueryDto): Promise<Suggestions> {
    return this.products.suggest(q);
  }
}
