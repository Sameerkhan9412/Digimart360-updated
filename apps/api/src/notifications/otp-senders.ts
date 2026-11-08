import { Injectable } from '@nestjs/common';
import { OtpChannel } from '@prisma/client';
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
