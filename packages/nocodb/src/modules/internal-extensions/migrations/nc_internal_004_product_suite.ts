import type { Knex } from 'knex';

export const INTERNAL_BASE_FEATURES_TABLE = 'nc_internal_base_features';
export const INTERNAL_VALIDATION_RULES_TABLE = 'nc_internal_validation_rules';
export const INTERNAL_RECORD_COMMENTS_TABLE = 'nc_internal_record_comments';
export const INTERNAL_DOCUMENTS_TABLE = 'nc_internal_documents';
export const INTERNAL_DOCUMENT_GRANTS_TABLE = 'nc_internal_document_grants';
export const INTERNAL_DOCUMENT_REVISIONS_TABLE =
  'nc_internal_document_revisions';
export const INTERNAL_DOCUMENT_COMMENTS_TABLE = 'nc_internal_document_comments';
export const INTERNAL_NOTIFICATIONS_TABLE = 'nc_internal_notifications';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(INTERNAL_BASE_FEATURES_TABLE, (table) => {
    table.string('workspace_id', 20).notNullable();
    table.string('base_id', 20).notNullable();
    table.string('feature_key', 64).notNullable();
    table.boolean('enabled').notNullable().defaultTo(true);
    table.integer('revision').notNullable().defaultTo(1);
    table.string('updated_by', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.primary(['base_id', 'feature_key']);
    table.index(['workspace_id', 'base_id']);
  });

  await knex.schema.createTable(INTERNAL_VALIDATION_RULES_TABLE, (table) => {
    table.string('id', 20).primary();
    table.string('workspace_id', 20).notNullable();
    table.string('base_id', 20).notNullable();
    table.string('model_id', 20).notNullable();
    table.string('field_key', 255).notNullable();
    table.text('rules').notNullable();
    table.integer('revision').notNullable().defaultTo(1);
    table.string('updated_by', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['base_id', 'model_id', 'field_key']);
    table.index(['workspace_id', 'base_id', 'model_id']);
  });

  await knex.schema.createTable(INTERNAL_RECORD_COMMENTS_TABLE, (table) => {
    table.string('id', 20).primary();
    table.string('workspace_id', 20).notNullable();
    table.string('base_id', 20).notNullable();
    table.string('model_id', 20).notNullable();
    table.string('record_id', 255).notNullable();
    table.string('parent_id', 20).nullable();
    table.text('body').notNullable();
    table.text('mentions').nullable();
    table.string('created_by', 255).notNullable();
    table.string('updated_by', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.index(['workspace_id', 'base_id', 'model_id', 'record_id']);
    table.index('parent_id');
  });

  await knex.schema.createTable(INTERNAL_DOCUMENTS_TABLE, (table) => {
    table.string('id', 20).primary();
    table.string('workspace_id', 20).notNullable();
    table.string('base_id', 20).notNullable();
    table.string('parent_id', 20).nullable();
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table.text('metadata').nullable();
    table.integer('display_order').notNullable().defaultTo(1);
    table.integer('version').notNullable().defaultTo(1);
    table.string('created_by', 255).notNullable();
    table.string('updated_by', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.index(['workspace_id', 'base_id', 'parent_id', 'display_order']);
  });

  await knex.schema.createTable(INTERNAL_DOCUMENT_GRANTS_TABLE, (table) => {
    table.string('id', 20).primary();
    table.string('document_id', 20).notNullable();
    table.string('subject_type', 16).notNullable();
    table.string('subject_id', 255).notNullable();
    table.string('permission', 16).notNullable();
    table.string('created_by', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    // Avoid a PostgreSQL identifier truncation collision with the subject
    // lookup index declared below.
    table.unique(['document_id', 'subject_type', 'subject_id', 'permission'], {
      indexName: 'nc_int_doc_grant_subject_permission_uq',
    });
    table.index(['document_id', 'subject_type', 'subject_id']);
  });

  await knex.schema.createTable(INTERNAL_DOCUMENT_REVISIONS_TABLE, (table) => {
    table.string('id', 20).primary();
    table.string('document_id', 20).notNullable();
    table.integer('revision').notNullable();
    table.string('author_id', 255).notNullable();
    table.string('summary', 512).nullable();
    table.text('snapshot').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['document_id', 'revision']);
    table.index(['document_id', 'created_at']);
  });

  await knex.schema.createTable(INTERNAL_DOCUMENT_COMMENTS_TABLE, (table) => {
    table.string('id', 20).primary();
    table.string('document_id', 20).notNullable();
    table.string('parent_id', 20).nullable();
    table.text('anchor').nullable();
    table.text('body').notNullable();
    table.text('mentions').nullable();
    table.string('created_by', 255).notNullable();
    table.string('updated_by', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('resolved_at').nullable();
    table.string('resolved_by', 255).nullable();
    table.timestamp('deleted_at').nullable();
    table.index(['document_id', 'created_at']);
    table.index('parent_id');
  });

  await knex.schema.createTable(INTERNAL_NOTIFICATIONS_TABLE, (table) => {
    table.string('id', 20).primary();
    table.string('user_id', 255).notNullable();
    table.string('type', 32).notNullable();
    table.string('resource_type', 32).notNullable();
    table.string('resource_id', 255).notNullable();
    table.string('workspace_id', 20).notNullable();
    table.string('base_id', 20).notNullable();
    table.text('payload').nullable();
    table.timestamp('read_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['user_id', 'read_at', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(INTERNAL_NOTIFICATIONS_TABLE);
  await knex.schema.dropTableIfExists(INTERNAL_DOCUMENT_COMMENTS_TABLE);
  await knex.schema.dropTableIfExists(INTERNAL_DOCUMENT_REVISIONS_TABLE);
  await knex.schema.dropTableIfExists(INTERNAL_DOCUMENT_GRANTS_TABLE);
  await knex.schema.dropTableIfExists(INTERNAL_DOCUMENTS_TABLE);
  await knex.schema.dropTableIfExists(INTERNAL_RECORD_COMMENTS_TABLE);
  await knex.schema.dropTableIfExists(INTERNAL_VALIDATION_RULES_TABLE);
  await knex.schema.dropTableIfExists(INTERNAL_BASE_FEATURES_TABLE);
}
