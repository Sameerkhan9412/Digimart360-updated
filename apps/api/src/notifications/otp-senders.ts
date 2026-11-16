import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel } from '@prisma/client';
import { Env } from '../config/env.validation';
import { MailService } from './mail.service';

/**
 * Delivers a one-time code over one channel. Add WhatsApp (e.g. Meta Cloud API,
 * Gupshup, MSG91) by implementing this interface and registering it in
 * NotificationsModule; nothing else in the sign-in flow changes.
 */
export interface OtpSender {
  readonly channel: OtpChannel;
  send(destination: string, code: string, ttlMinutes: number): Promise<void>;
}

export const OTP_SENDERS = Symbol('OTP_SENDERS');

@Injectable()
export class EmailOtpSender implements OtpSender {
  readonly channel = OtpChannel.EMAIL;

  constructor(private readonly mail: MailService) {}

  async send(email: string, code: string, ttlMinutes: number): Promise<void> {
    await this.mail.send({
      to: email,
      subject: `${code} is your DIGI MART 360 sign-in code`,
      text:
        `Your DIGI MART 360 sign-in code is ${code}.\n\n` +
        `It expires in ${ttlMinutes} minutes. If you didn't try to sign in, you can ignore this email.`,
      html:
        `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1d2b3a">` +
        `<p>Your DIGI MART 360 sign-in code is</p>` +
        `<p style="font-size:30px;font-weight:700;letter-spacing:6px;color:#1A3C5E">${code}</p>` +
        `<p>It expires in ${ttlMinutes} minutes. If you didn't try to sign in, you can ignore this email.</p></div>`,
    });
  }
}

/**
 * Sends the code as a WhatsApp message through Twilio's REST API (no SDK needed).
 * - With TWILIO_CONTENT_SID the approved authentication template is used (required in production).
 * - Without it a plain text message is sent, which only works for the Twilio sandbox.
 * Credentials are read at construction; the auth token is never logged.
 */
@Injectable()
export class WhatsAppOtpSender implements OtpSender {
  readonly channel = OtpChannel.WHATSAPP;

  constructor(private readonly config: ConfigService<Env, true>) {}

  /** True when Twilio is fully configured. */
  static enabled(config: ConfigService<Env, true>): boolean {
    return !!(
      config.get('TWILIO_ACCOUNT_SID', { infer: true }) &&
      config.get('TWILIO_AUTH_TOKEN', { infer: true }) &&
      config.get('TWILIO_WHATSAPP_FROM', { infer: true })
    );
  }

  async send(phone: string, code: string, ttlMinutes: number): Promise<void> {
    const sid = this.config.get('TWILIO_ACCOUNT_SID', { infer: true }) as string;
    const token = this.config.get('TWILIO_AUTH_TOKEN', { infer: true }) as string;
    const contentSid = this.config.get('TWILIO_CONTENT_SID', { infer: true });

    const form = new URLSearchParams({
      From: this.config.get('TWILIO_WHATSAPP_FROM', { infer: true }) as string,
      To: `whatsapp:${phone}`,
    });
    if (contentSid) {
      form.set('ContentSid', contentSid);
      form.set('ContentVariables', JSON.stringify({ '1': code }));
    } else {
      form.set('Body', `${code} is your DIGI MART 360 sign-in code. It expires in ${ttlMinutes} minutes. Do not share it with anyone.`);
    }

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      let detail = '';
      try {
        const body = (await res.json()) as { code?: number; message?: string };
        detail = ` (Twilio ${body.code ?? '?'}: ${body.message ?? 'no message'})`;
      } catch {
        /* non-JSON error body */
      }
      throw new Error(`Twilio WhatsApp send failed with HTTP ${res.status}${detail}`);
    }
  }
}
