import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma, Role, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

/** The user fields safe to send to any client. */
export class PublicUser {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true, type: String, description: 'Null for accounts created by phone until an email is added' }) email: string | null;
  @ApiProperty() emailVerified: boolean;
  @ApiPropertyOptional({ nullable: true, type: String }) phone: string | null;
  @ApiProperty({ description: 'True once the number was proved with a WhatsApp code; only then can it sign in' }) phoneVerified: boolean;
  @ApiPropertyOptional({ nullable: true, type: String }) avatarUrl: string | null;
  @ApiProperty() hasGoogle: boolean;
  @ApiProperty({ enum: Role }) role: Role;
  @ApiProperty({ enum: UserStatus }) status: UserStatus;
  @ApiProperty() createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.toPublic(user);
  }

  async updateMe(id: string, dto: UpdateMeDto): Promise<PublicUser> {
    try {
      // A changed number is unverified until its owner signs in with it by WhatsApp.
      const current = dto.phone !== undefined ? await this.prisma.user.findUnique({ where: { id }, select: { phone: true } }) : null;
      const phoneChanged = dto.phone !== undefined && dto.phone !== current?.phone;
      const user = await this.prisma.user.update({
        where: { id },
        data: { name: dto.name?.trim(), phone: dto.phone, ...(phoneChanged && { phoneVerifiedAt: null }) },
      });
      return this.toPublic(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('This phone number is already used by another account');
      }
      throw e;
    }
  }

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: !!user.emailVerifiedAt,
      phone: user.phone,
      phoneVerified: !!user.phoneVerifiedAt,
      avatarUrl: user.avatarUrl,
      hasGoogle: !!user.googleId,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
