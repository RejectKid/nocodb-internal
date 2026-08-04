import type { Knex } from 'knex';

export const INTERNAL_BASE_PERMISSION_CONFIGS_TABLE =
  'nc_internal_base_permission_configs';
export const INTERNAL_BASE_PERMISSION_GRANTS_TABLE =
  'nc_internal_base_permission_grants';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(
    INTERNAL_BASE_PERMISSION_CONFIGS_TABLE,
    (table) => {
      table.string('base_id', 20).primary();
      table.string('workspace_id', 20).notNullable().index();
      table.boolean('enabled').notNullable().defaultTo(false);
      table.integer('schema_version').notNullable().defaultTo(1);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('created_by', 20).notNullable();
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      table.string('updated_by', 20).notNullable();
      table.unique(['workspace_id', 'base_id']);
    },
  );

  await knex.schema.createTable(
    INTERNAL_BASE_PERMISSION_GRANTS_TABLE,
    (table) => {
      table.string('id', 20).primary();
      table.string('workspace_id', 20).notNullable();
      table.string('base_id', 20).notNullable();
      table.string('subject_type', 16).notNullable();
      table.string('subject_id', 255).notNullable();
      table.string('permission', 64).notNullable();
      table.string('effect', 8).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('created_by', 20).notNullable();
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      table.string('updated_by', 20).notNullable();
      table.index(['workspace_id', 'base_id']);
      table.index(['base_id', 'subject_type', 'subject_id']);
      // Keep this explicit and below PostgreSQL's 63-byte identifier limit.
      // The generated unique name otherwise collides with the preceding index
      // after PostgreSQL truncates both identifiers.
      table.unique(['base_id', 'subject_type', 'subject_id', 'permission'], {
        indexName: 'nc_int_base_perm_grant_subject_permission_uq',
      });
    },
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(INTERNAL_BASE_PERMISSION_GRANTS_TABLE);
  await knex.schema.dropTableIfExists(INTERNAL_BASE_PERMISSION_CONFIGS_TABLE);
}
