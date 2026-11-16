import { ConfigService } from '@nestjs/config';
import { WhatsAppOtpSender } from './otp-senders';

function sender(extra: Record<string, string> = {}) {
  const values: Record<string, string> = {
    TWILIO_ACCOUNT_SID: 'AC' + 'a'.repeat(32),
    TWILIO_AUTH_TOKEN: 'tok3n',
    TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
    ...extra,
  };
  const config = { get: (k: string) => values[k] } as unknown as ConfigService<never, true>;
  return { sender: new WhatsAppOtpSender(config as never), config };
}

describe('WhatsAppOtpSender', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  function mockFetch(res: Response) {
    const calls: { url: string; init: RequestInit }[] = [];
    global.fetch = jest.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return res;
    }) as unknown as typeof fetch;
    return calls;
  }

  it('is on only when SID, token and sender are all set', () => {
    expect(WhatsAppOtpSender.enabled(sender().config as never)).toBe(true);
    expect(WhatsAppOtpSender.enabled(sender({ TWILIO_AUTH_TOKEN: '' }).config as never)).toBe(false);
  });

  it('sends plain text from the sandbox sender, authenticated with the account', async () => {
    const calls = mockFetch(new Response('{}', { status: 201 }));
    await sender().sender.send('+919822012345', '048213', 10);

    expect(calls[0].url).toBe(`https://api.twilio.com/2010-04-01/Accounts/AC${'a'.repeat(32)}/Messages.json`);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from(`AC${'a'.repeat(32)}:tok3n`).toString('base64')}`);
    const body = calls[0].init.body as URLSearchParams;
    expect(body.get('To')).toBe('whatsapp:+919822012345');
    expect(body.get('From')).toBe('whatsapp:+14155238886');
    expect(body.get('Body')).toContain('048213');
    expect(body.get('ContentSid')).toBeNull();
  });

  it('uses the approved template when a content SID is set', async () => {
    const calls = mockFetch(new Response('{}', { status: 201 }));
    await sender({ TWILIO_CONTENT_SID: 'HX' + 'b'.repeat(32) }).sender.send('+919822012345', '048213', 10);
    const body = calls[0].init.body as URLSearchParams;
    expect(body.get('ContentSid')).toBe('HX' + 'b'.repeat(32));
    expect(JSON.parse(body.get('ContentVariables')!)).toEqual({ '1': '048213' });
    expect(body.get('Body')).toBeNull();
  });

  it('reports Twilio errors without leaking the token or the code', async () => {
    mockFetch(new Response(JSON.stringify({ code: 63016, message: 'Recipient not opted in' }), { status: 400 }));
    const err = await sender().sender.send('+919822012345', '048213', 10).catch((e: Error) => e);
    expect((err as Error).message).toContain('63016');
    expect((err as Error).message).not.toContain('tok3n');
    expect((err as Error).message).not.toContain('048213');
  });
});
