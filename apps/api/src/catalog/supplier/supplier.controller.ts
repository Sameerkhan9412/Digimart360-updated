import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateCompanyDto, UpdateCompanyDto } from '../companies/companies.dto';
import { CompaniesService } from '../companies/companies.service';
import { OwnCompany, OwnProduct } from '../dto/views';
import { CreateProductDto, OwnProductsQueryDto, UpdateProductDto } from './supplier-products.dto';
import { SupplierProductsService } from './supplier-products.service';

/**
 * The signed-in supplier's own company and products. Access is decided by
 * owning a company, not by role, so a buyer who just created a company can
 * continue straight away.
 */
@ApiTags('supplier')
@ApiBearerAuth()
@Controller('me')
export class SupplierController {
  constructor(
    private readonly companies: CompaniesService,
    private readonly products: SupplierProductsService,
  ) {}

  /** Create your company profile. Buyers become suppliers; call /auth/refresh afterwards for the new role. */
  @Post('company')
  @ApiCreatedResponse({ type: OwnCompany })
  createCompany(@CurrentUser() user: AuthUser, @Body() dto: CreateCompanyDto): Promise<OwnCompany> {
    return this.companies.create(user.id, user.role, dto);
  }

  @Get('company')
  @ApiOkResponse({ type: OwnCompany })
  company(@CurrentUser() user: AuthUser): Promise<OwnCompany> {
    return this.companies.mine(user.id);
  }

  /** Edit your company. Changing the GSTIN removes the "GST verified" badge until it's checked again. */
  @Patch('company')
  @ApiOkResponse({ type: OwnCompany })
  updateCompany(@CurrentUser() user: AuthUser, @Body() dto: UpdateCompanyDto): Promise<OwnCompany> {
    return this.companies.update(user.id, dto);
  }

  /** Your products in every status except archived (unless you filter for it). */
  @Get('products')
  @ApiOkResponse({ type: [OwnProduct] })
  products_(@CurrentUser() user: AuthUser, @Query() q: OwnProductsQueryDto): Promise<OwnProduct[]> {
    return this.products.list(user.id, q.status);
  }

  @Get('products/:id')
  @ApiOkResponse({ type: OwnProduct })
  product(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<OwnProduct> {
    return this.products.get(user.id, id);
  }

  /** Add a product. Sent for review unless `submit: false` (draft). DM Trusted suppliers go live at once. */
  @Post('products')
  @ApiCreatedResponse({ type: OwnProduct })
  createProduct(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto): Promise<OwnProduct> {
    return this.products.create(user.id, dto);
  }

  /** Edit a product. Content changes to a live product send it back for review; price and MOQ changes don't. */
  @Patch('products/:id')
  @ApiOkResponse({ type: OwnProduct })
  updateProduct(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<OwnProduct> {
    return this.products.update(user.id, id, dto);
  }

  /** Archive (hide) a product. Restore it with POST /me/products/:id/restore. */
  @Delete('products/:id')
  @ApiOkResponse({ type: OwnProduct })
  archive(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<OwnProduct> {
    return this.products.archive(user.id, id);
  }

  @Post('products/:id/restore')
  @ApiOkResponse({ type: OwnProduct })
  restore(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<OwnProduct> {
    return this.products.restore(user.id, id);
  }
}
