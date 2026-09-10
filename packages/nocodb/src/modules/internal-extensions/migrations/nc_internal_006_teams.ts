import type { Knex } from 'knex';

export const INTERNAL_TEAMS_TABLE = 'nc_internal_teams';
export const INTERNAL_TEAM_MEMBERS_TABLE = 'nc_internal_team_members';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(INTERNAL_TEAMS_TABLE, (t) => {
    t.string('id', 20).primary();
    t.string('workspace_id', 20).notNullable().index();
    t.string('name', 128).notNullable();
    t.integer('revision').notNullable().defaultTo(1);
    t.timestamp('archived_at').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.string('created_by', 20).notNullable();
  });
  await knex.schema.createTable(INTERNAL_TEAM_MEMBERS_TABLE, (t) => {
    t.string('team_id', 20)
      .notNullable()
      .references('id')
      .inTable(INTERNAL_TEAMS_TABLE)
      .onDelete('CASCADE');
    t.string('user_id', 20).notNullable();
    t.primary(['team_id', 'user_id']);
    t.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  for (const table of [
    'nc_internal_base_permission_grants',
    'nc_internal_document_grants',
  ]) {
    if (await knex.schema.hasTable(table))
      await knex(table).where('subject_type', 'team').delete();
  }
  await knex.schema.dropTableIfExists(INTERNAL_TEAM_MEMBERS_TABLE);
  await knex.schema.dropTableIfExists(INTERNAL_TEAMS_TABLE);
}
