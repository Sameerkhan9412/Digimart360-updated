import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { Env, MailTransport } from '../config/env.validation';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Sends email through SMTP, or prints it to the log in development. */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit() {
    if (this.config.get('MAIL_TRANSPORT', { infer: true }) === MailTransport.Smtp) {
      this.transporter = createTransport(this.config.get('SMTP_URL', { infer: true }) as string);
    }
  }

  async send(msg: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[console mail] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
      return;
    }
    await this.transporter.sendMail({ from: this.config.get('MAIL_FROM', { infer: true }), ...msg });
  }
}
