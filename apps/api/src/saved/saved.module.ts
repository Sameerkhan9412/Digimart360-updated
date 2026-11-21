import { Module } from '@nestjs/common';
import { SavedController } from './saved.controller';
import { SavedService } from './saved.service';

/** Buyers keep a shortlist of suppliers to come back to. */
@Module({ controllers: [SavedController], providers: [SavedService] })
export class SavedModule {}
