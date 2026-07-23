import { Injectable, type OnModuleInit } from '@nestjs/common';
import { MetaService } from '~/meta/meta.service';
import { InternalMigrationSource } from './internal-migration-source';

export const INTERNAL_MIGRATION_TABLE = 'xc_internal_knex_migrations';

@Injectable()
export class InternalExtensionsMigrationService implements OnModuleInit {
  constructor(private readonly metaService: MetaService) {}

  async onModuleInit(): Promise<void> {
    await this.metaService.knexConnection.migrate.latest({
      migrationSource: new InternalMigrationSource(),
      tableName: INTERNAL_MIGRATION_TABLE,
    });
  }
}
