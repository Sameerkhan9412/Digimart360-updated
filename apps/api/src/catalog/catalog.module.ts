import { Module } from '@nestjs/common';
import { CatalogAdminController } from './admin/catalog-admin.controller';
import { CatalogAdminService } from './admin/catalog-admin.service';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { CompaniesController } from './companies/companies.controller';
import { CompaniesService } from './companies/companies.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { SupplierController } from './supplier/supplier.controller';
import { SupplierProductsService } from './supplier/supplier-products.service';

/** Categories, supplier companies and products: public browsing, supplier self-service, admin moderation. */
@Module({
  controllers: [CategoriesController, ProductsController, CompaniesController, SupplierController, CatalogAdminController],
  providers: [CategoriesService, ProductsService, CompaniesService, SupplierProductsService, CatalogAdminService],
  exports: [CategoriesService, ProductsService],
})
export class CatalogModule {}
