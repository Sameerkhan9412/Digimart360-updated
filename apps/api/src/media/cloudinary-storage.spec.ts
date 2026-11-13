import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { CloudinaryStorage } from './storage';

function storage(url = 'cloudinary://key123:s3cr3t@democloud') {
  const config = { get: (k: string) => (k === 'CLOUDINARY_URL' ? url : undefined) } as unknown as ConfigService<never, true>;
  return new CloudinaryStorage(config as never);
}

describe('CloudinaryStorage', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('serves files from the account\'s digimart folder', () => {
    expect(storage().baseUrl).toBe('https://res.cloudinary.com/democloud/image/upload/digimart');
  });

  it('uploads with a valid signature and returns the delivery URL', async () => {
    const calls: { url: string; body: FormData }[] = [];
    global.fetch = jest.fn(async (url: string, init: { body: FormData }) => {
      calls.push({ url, body: init.body });
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;

    const url = await storage().put('companies/abc/uuid-1.jpg', Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg');

    expect(url).toBe('https://res.cloudinary.com/democloud/image/upload/digimart/companies/abc/uuid-1.jpg');
    expect(calls[0].url).toBe('https://api.cloudinary.com/v1_1/democloud/image/upload');
    const form = calls[0].body;
    expect(form.get('api_key')).toBe('key123');
    // Cloudinary expects the public id without a file extension, and the secret must never be sent.
    expect(form.get('public_id')).toBe('digimart/companies/abc/uuid-1');
    expect([...form.keys()]).not.toContain('api_secret');
    const expected = createHash('sha1').update(`public_id=digimart/companies/abc/uuid-1&timestamp=${form.get('timestamp')}s3cr3t`).digest('hex');
    expect(form.get('signature')).toBe(expected);
    expect(form.get('file')).toBeInstanceOf(Blob);
  });

  it('fails with a friendly message when Cloudinary rejects the upload', async () => {
    global.fetch = jest.fn(async () => new Response('Invalid Signature', { status: 401 })) as unknown as typeof fetch;
    await expect(storage().put('companies/abc/x.png', Buffer.from('x'), 'image/png')).rejects.toThrow('Photo storage is unavailable');
  });

  it('delete never throws', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    await expect(storage().remove('companies/abc/x.png')).resolves.toBeUndefined();
  });
});
