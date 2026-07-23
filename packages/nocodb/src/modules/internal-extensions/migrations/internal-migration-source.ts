import type { Knex } from 'knex';
import * as nc_internal_001_api_tokens from './nc_internal_001_api_tokens';

const migrations = {
  nc_internal_001_api_tokens,
};

export class InternalMigrationSource implements Knex.MigrationSource<string> {
  getMigrations(): Promise<string[]> {
    return Promise.resolve(Object.keys(migrations));
  }

  getMigrationName(migration: string): string {
    return migration;
  }

  async getMigration(migration: string): Promise<Knex.Migration> {
    const resolved = migrations[migration as keyof typeof migrations];
    if (!resolved) {
      throw new Error(`Unknown internal migration: ${migration}`);
    }
    return resolved;
  }
}
