import { Controller, HttpStatus, ParseFilePipeBuilder, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { CompaniesService } from '../catalog/companies/companies.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { MAX_IMAGE_BYTES, MediaService, UploadedImage } from './media.service';

@ApiTags('supplier')
@ApiBearerAuth()
@Controller('me/uploads')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly companies: CompaniesService,
  ) {}

  /** Upload one product photo (JPEG, PNG or WebP, up to 5 MB). Returns the URL to put in a product's `images`. */
  @Post('images')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0, parts: 2 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @ApiCreatedResponse({ type: UploadedImage })
  async uploadImage(
    @CurrentUser() user: AuthUser,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true, errorHttpStatusCode: HttpStatus.BAD_REQUEST }))
    file: Express.Multer.File,
  ): Promise<UploadedImage> {
    const company = await this.companies.requireMine(user.id);
    return this.media.saveProductImage(company.id, file);
  }
}
