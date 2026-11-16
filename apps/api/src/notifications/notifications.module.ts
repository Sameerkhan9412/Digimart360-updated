import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.validation';
import { MailService } from './mail.service';
import { EmailOtpSender, OTP_SENDERS, OtpSender, WhatsAppOtpSender } from './otp-senders';

@Global()
@Module({
  providers: [
    MailService,
    EmailOtpSender,
    {
      provide: OTP_SENDERS,
      inject: [EmailOtpSender, ConfigService],
      // WhatsApp is registered only when Twilio is fully configured.
      useFactory: (email: EmailOtpSender, config: ConfigService<Env, true>): OtpSender[] => {
        const senders: OtpSender[] = [email];
        if (WhatsAppOtpSender.enabled(config)) senders.push(new WhatsAppOtpSender(config));
        return senders;
      },
    },
  ],
  exports: [MailService, OTP_SENDERS],
})
export class NotificationsModule {}
