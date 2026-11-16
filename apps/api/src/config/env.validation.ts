import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum MailTransport {
  /** Prints emails (and OTP codes) to the server log. Development only. */
  Console = 'console',
  /** Sends through any SMTP provider (Amazon SES, Brevo, Zoho, Gmail Workspace…). */
  Smtp = 'smtp',
}

const blankToUndefined = ({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

const csv = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value
    : String(value ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

/** Typed, validated environment. The app refuses to start if this fails. */
export class Env {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  @Matches(/^postgres(ql)?:\/\//, { message: 'DATABASE_URL must be a postgresql:// URL' })
  DATABASE_URL: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
  JWT_ACCESS_SECRET: string;

  @IsString()
  @Matches(/^\d+[smhd]$/, { message: 'JWT_ACCESS_TTL must look like 15m, 1h or 1d' })
  JWT_ACCESS_TTL = '15m';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(365)
  REFRESH_TOKEN_TTL_DAYS = 30;

  @Transform(csv)
  @IsString({ each: true })
  CORS_ORIGINS: string[] = [];

  /** OAuth client IDs whose Google ID tokens we accept (web, Android, iOS). Empty = Google sign-in off. */
  @Transform(csv)
  @IsString({ each: true })
  GOOGLE_CLIENT_IDS: string[] = [];

  @IsEnum(MailTransport)
  MAIL_TRANSPORT: MailTransport = MailTransport.Console;

  /** e.g. smtps://user:pass@email-smtp.ap-south-1.amazonaws.com:465 */
  @IsOptional()
  @IsString()
  SMTP_URL?: string;

  /** Set to "true" to serve the Swagger docs at /api/docs in production (always on in development). */
  @IsOptional()
  @IsString()
  ENABLE_API_DOCS?: string;

  /** Explicit opt-in for private demos: sign-in codes go to the logs instead of email. */
  @IsOptional()
  @IsString()
  ALLOW_CONSOLE_MAIL?: string;

  @IsString()
  MAIL_FROM ='DIGI MART 360 <no-reply@digimart360.local>';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(2)
  @Max(30)
  OTP_TTL_MINUTES = 10;

  /** Public address of the website, used in links inside emails. */
  @IsString()
  @Matches(/^https?:\/\//, { message: 'WEB_URL must start with http:// or https://' })
  WEB_URL = 'http://localhost:3001';

  /** Suppliers get <slug>.ROOT_DOMAIN as their own website. Use "localhost" in development. */
  @IsString()
  ROOT_DOMAIN = 'localhost';

  /** Host name suppliers point their own domain's CNAME at (shown in the dashboard). */
  @IsOptional()
  @IsString()
  SITES_TARGET?: string;

  /** Cloudinary account for photos: cloudinary://API_KEY:API_SECRET@CLOUD_NAME. Empty = save photos on local disk. */
  @Transform(({ value }) => (typeof value === 'string' && value.trim() ? value.trim() : undefined))
  @IsOptional()
  @Matches(/^cloudinary:\/\/[^:]+:[^@]+@[^/]+$/, { message: 'CLOUDINARY_URL must look like cloudinary://API_KEY:API_SECRET@CLOUD_NAME' })
  CLOUDINARY_URL?: string;

  /** Folder for uploaded product photos. In Docker this is a mounted volume. */
  @IsString()
  UPLOAD_DIR = './uploads';

  /** Public URL prefix of uploaded files, as browsers and apps will see it (no trailing slash needed). */
  @IsString()
  @Matches(/^https?:\/\//, { message: 'MEDIA_BASE_URL must start with http:// or https://' })
  MEDIA_BASE_URL = 'http://localhost:3000/media';

  @IsOptional()
  @IsEmail()
  SEED_ADMIN_EMAIL?: string;

  /** Twilio WhatsApp sign-in codes. All three of SID, token and sender must be set to turn it on. */
  @Transform(blankToUndefined)
  @IsOptional()
  @Matches(/^AC[0-9a-f]{32}$/i, { message: 'TWILIO_ACCOUNT_SID must look like ACxxxxxxxx… (34 characters)' })
  TWILIO_ACCOUNT_SID?: string;

  @Transform(blankToUndefined)
  @IsOptional()
  @IsString()
  TWILIO_AUTH_TOKEN?: string;

  /** The WhatsApp sender, e.g. whatsapp:+14155238886 (the Twilio sandbox) or your approved number. */
  @Transform(blankToUndefined)
  @IsOptional()
  @Matches(/^whatsapp:\+[1-9]\d{7,14}$/, { message: 'TWILIO_WHATSAPP_FROM must look like whatsapp:+14155238886' })
  TWILIO_WHATSAPP_FROM?: string;

  /** Approved authentication template (HX…). Needed in production; leave empty on the sandbox to send plain text. */
  @Transform(blankToUndefined)
  @IsOptional()
  @Matches(/^HX[0-9a-f]{32}$/i, { message: 'TWILIO_CONTENT_SID must look like HXxxxxxxxx… (34 characters)' })
  TWILIO_CONTENT_SID?: string;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { exposeDefaultValues: true });
  const errors = validateSync(env);
  const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
  if (env.MAIL_TRANSPORT === MailTransport.Smtp && !env.SMTP_URL) {
    messages.push('SMTP_URL is required when MAIL_TRANSPORT=smtp');
  }
  if (env.NODE_ENV === NodeEnv.Production && env.MAIL_TRANSPORT === MailTransport.Console && env.ALLOW_CONSOLE_MAIL !== 'true') {
    messages.push('MAIL_TRANSPORT=console is not allowed in production (codes would only be logged)');
  }
  const twilio = [env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, env.TWILIO_WHATSAPP_FROM];
  if (twilio.some(Boolean) && !twilio.every(Boolean)) {
    messages.push('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM must be set together');
  }
  if (env.TWILIO_CONTENT_SID && !twilio.every(Boolean)) {
    messages.push('TWILIO_CONTENT_SID needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM');
  }
  if (messages.length) {
    throw new Error(`Invalid environment configuration:\n  - ${messages.join('\n  - ')}\nSee .env.example.`);
  }
  return env;
}
