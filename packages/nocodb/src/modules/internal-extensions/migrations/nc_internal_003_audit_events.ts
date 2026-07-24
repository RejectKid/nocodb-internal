import type { Knex } from 'knex';

export const INTERNAL_AUDIT_EVENTS_TABLE = 'nc_internal_audit_events';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(INTERNAL_AUDIT_EVENTS_TABLE, (table) => {
    table.string('id', 20).primary();
    table.integer('schema_version').notNullable().defaultTo(1);
    table.string('actor_type', 16).notNullable();
    table.string('actor_id', 255).nullable();
    table.string('action', 64).notNullable();
    table.string('resource_type', 32).notNullable();
    table.string('resource_id', 255).notNullable();
    table.string('workspace_id', 20).nullable();
    table.string('base_id', 20).nullable();
    table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    table.string('request_id', 128).nullable();
    table.string('ip_address', 64).nullable();
    table.string('user_agent', 512).nullable();
    table.text('before_summary').nullable();
    table.text('after_summary').nullable();
    table.text('metadata').nullable();
    table.index(['workspace_id', 'occurred_at']);
    table.index(['workspace_id', 'base_id', 'occurred_at']);
    table.index(['action', 'occurred_at']);
    table.index(['actor_id', 'occurred_at']);
    table.index(['resource_type', 'resource_id', 'occurred_at']);
    table.index('request_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(INTERNAL_AUDIT_EVENTS_TABLE);
}
