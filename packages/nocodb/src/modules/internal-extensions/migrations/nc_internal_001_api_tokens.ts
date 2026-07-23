import type { Knex } from 'knex';

export const INTERNAL_API_TOKENS_TABLE = 'nc_internal_api_tokens';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(INTERNAL_API_TOKENS_TABLE, (table) => {
    table.string('id', 20).primary();
    table.string('user_id', 20).notNullable().index();
    table.string('display_name', 255).notNullable();
    table.string('token_hash', 512).notNullable();
    table.string('token_prefix', 32).notNullable().unique();
    table.integer('hash_version').notNullable().defaultTo(1);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.string('created_by', 20).notNullable();
    table.timestamp('expires_at').nullable().index();
    table.timestamp('last_used_at').nullable();
    table.timestamp('revoked_at').nullable().index();
    table.string('revoked_by', 20).nullable();
    table.text('allowed_workspace_ids').notNullable().defaultTo('[]');
    table.text('allowed_base_ids').notNullable().defaultTo('[]');
    table.text('scopes').notNullable().defaultTo('[]');
    table.integer('scope_version').notNullable().defaultTo(1);
    table.text('metadata').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(INTERNAL_API_TOKENS_TABLE);
}
