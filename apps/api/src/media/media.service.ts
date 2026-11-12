import { BadRequestException, Injectable, PayloadTooLargeException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { Storage } from './storage';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export class UploadedImage {
  @ApiProperty({ example: 'http://localhost:3000/media/companies/…/3f2c….webp', description: 'Use this in product `images`' })
  url: string;
  @ApiProperty({ example: 'image/webp' }) contentType: string;
  @ApiProperty({ example: 182344 }) size: number;
}

/**
 * Identify an image by its first bytes, never by the file name or the
 * browser-supplied type. SVG is deliberately not accepted: it can carry scripts.
 */
export function sniffImage(buf: Buffer): { ext: string; type: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', type: 'image/png' };
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', type: 'image/webp' };
  }
  return null;
}

@Injectable()
export class MediaService {
  constructor(private readonly storage: Storage) {}

  /** Folder prefix for a company's files. Product images must start with it. */
  companyPrefix(companyId: string): string {
    return `${this.storage.baseUrl}/companies/${companyId}/`;
  }

  async saveProductImage(companyId: string, file?: Express.Multer.File): Promise<UploadedImage> {
    if (!file?.buffer?.length) throw new BadRequestException('Attach an image in the "file" field');
    if (file.size > MAX_IMAGE_BYTES) throw new PayloadTooLargeException('Images can be up to 5 MB');
    const kind = sniffImage(file.buffer);
    if (!kind) throw new BadRequestException('Only JPEG, PNG or WebP images are accepted');

    const key = `companies/${companyId}/${randomUUID()}.${kind.ext}`;
    const url = await this.storage.put(key, file.buffer, kind.type);
    return { url, contentType: kind.type, size: file.size };
  }

  /** Every image must be one this company uploaded to our storage. */
  assertOwnImages(companyId: string, urls: string[] | undefined): void {
    if (!urls?.length) return;
    const prefix = this.companyPrefix(companyId);
    const bad = urls.find((u) => !u.startsWith(prefix) || u.includes('..'));
    if (bad) throw new BadRequestException('Images must be uploaded through POST /me/uploads/images first');
  }
}
