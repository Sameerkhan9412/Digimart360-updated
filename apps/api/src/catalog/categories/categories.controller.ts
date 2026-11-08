import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CategoryNode, CategoryPage, CategoriesService } from './categories.service';

@ApiTags('catalog')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** The whole category tree with live product counts. Powers menus and the homepage. */
  @Get()
  @Public()
  @ApiOkResponse({ type: [CategoryNode] })
  tree(): Promise<CategoryNode[]> {
    return this.categories.tree();
  }

  /** One category: breadcrumb, sub-categories, counts and SEO title/description. */
  @Get(':slug')
  @Public()
  @ApiOkResponse({ type: CategoryPage })
  page(@Param('slug') slug: string): Promise<CategoryPage> {
    return this.categories.page(slug);
  }
}
