import type { Knex } from 'knex';
import { INTERNAL_API_TOKENS_TABLE } from './nc_internal_001_api_tokens';
import { INTERNAL_RECORD_COMMENTS_TABLE } from './nc_internal_004_product_suite';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(INTERNAL_API_TOKENS_TABLE, (table) => {
    table.timestamp('disabled_at').nullable();
  });
  await knex.schema.alterTable(INTERNAL_RECORD_COMMENTS_TABLE, (table) => {
    table.timestamp('resolved_at').nullable();
    table.string('resolved_by', 255).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(INTERNAL_RECORD_COMMENTS_TABLE, (table) => {
    table.dropColumn('resolved_by');
    table.dropColumn('resolved_at');
  });
  await knex.schema.alterTable(INTERNAL_API_TOKENS_TABLE, (table) => {
    table.dropColumn('disabled_at');
  });
}
