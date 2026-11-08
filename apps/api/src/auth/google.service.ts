import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { Env } from '../config/env.validation';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Verifies Google ID tokens. Web (Google Identity Services), Android and iOS
 * all obtain an ID token on the device and send it here, so one endpoint
 * serves every client. Accepted audiences come from GOOGLE_CLIENT_IDS.
 */
@Injectable()
export class GoogleService {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService<Env, true>) {}

  get enabled(): boolean {
    return this.config.get('GOOGLE_CLIENT_IDS', { infer: true }).length > 0;
  }

  async verify(idToken: string): Promise<GoogleProfile> {
    const audience = this.config.get('GOOGLE_CLIENT_IDS', { infer: true });
    if (!audience.length) throw new ServiceUnavailableException('Google sign-in is not configured on this server');

    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Google sign-in failed. Please try again.');
    }
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new UnauthorizedException('Your Google account email is not verified');
    }
    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture,
    };
  }
}
