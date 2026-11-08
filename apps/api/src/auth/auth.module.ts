import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Env } from '../config/env.validation';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService, ttlToSeconds } from './auth.service';
import { GoogleService } from './google.service';
import { OtpService } from './otp.service';

@Global()
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: {
          expiresIn: ttlToSeconds(config.get('JWT_ACCESS_TTL', { infer: true })),
          issuer: 'digimart360-api',
        },
        verifyOptions: { issuer: 'digimart360-api' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, GoogleService],
  // The global JwtAuthGuard needs JwtService everywhere.
  exports: [JwtModule],
})
export class AuthModule {}
