import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateCategoryDto, UpdateCategoryDto } from '../categories/categories.dto';
import { CategoriesService } from '../categories/categories.service';
import { OwnProduct } from '../dto/views';
import {
  AdminCompaniesQueryDto,
  AdminProductsQueryDto,
  ModerateCompanyDto,
  ModerationCompanyPage,
  ModerationProductPage,
  RejectProductDto,
} from './catalog-admin.dto';
import { CatalogAdminService } from './catalog-admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/catalog')
export class CatalogAdminController {
  constructor(
    private readonly admin: CatalogAdminService,
    private readonly categories: CategoriesService,
  ) {}

  /** Products by status; defaults to the review queue, oldest first. */
  @Get('products')
  @ApiOkResponse({ type: ModerationProductPage })
  products(@Query() q: AdminProductsQueryDto): Promise<ModerationProductPage> {
    return this.admin.products(q.status, q.page);
  }

  @Post('products/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: OwnProduct })
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.approveProduct(id);
  }

  /** Reject with a reason the supplier will see. */
  @Post('products/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: OwnProduct })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectProductDto) {
    return this.admin.rejectProduct(id, dto.reason);
  }

  /** Companies by status; defaults to those waiting for approval. */
  @Get('companies')
  @ApiOkResponse({ type: ModerationCompanyPage })
  companies(@Query() q: AdminCompaniesQueryDto): Promise<ModerationCompanyPage> {
    return this.admin.companies(q.status, q.page);
  }

  /** Approve or suspend a company, verify its GSTIN, grant or remove "DM Trusted". */
  @Patch('companies/:id')
  moderateCompany(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ModerateCompanyDto) {
    return this.admin.moderateCompany(id, dto);
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }
}
