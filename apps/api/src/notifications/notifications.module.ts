import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { EmailOtpSender, OTP_SENDERS, OtpSender } from './otp-senders';

@Global()
@Module({
  providers: [
    MailService,
    EmailOtpSender,
    {
      provide: OTP_SENDERS,
      inject: [EmailOtpSender],
      // Add WhatsAppOtpSender here when it's built.
      useFactory: (...senders: OtpSender[]) => senders,
    },
  ],
  exports: [MailService, OTP_SENDERS],
})
export class NotificationsModule {}
