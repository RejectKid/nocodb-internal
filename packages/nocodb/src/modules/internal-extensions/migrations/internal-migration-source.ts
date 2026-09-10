import type { Knex } from 'knex';
import * as nc_internal_001_api_tokens from './nc_internal_001_api_tokens';
import * as nc_internal_002_base_permissions from './nc_internal_002_base_permissions';
import * as nc_internal_003_audit_events from './nc_internal_003_audit_events';
import * as nc_internal_004_product_suite from './nc_internal_004_product_suite';
import * as nc_internal_005_parity_hardening from './nc_internal_005_parity_hardening';
import * as nc_internal_006_teams from './nc_internal_006_teams';

const migrations = {
  nc_internal_001_api_tokens,
  nc_internal_002_base_permissions,
  nc_internal_003_audit_events,
  nc_internal_004_product_suite,
  nc_internal_005_parity_hardening,
  nc_internal_006_teams,
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
