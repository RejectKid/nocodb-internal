import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import type { Knex } from 'knex';
import { MetaService } from '~/meta/meta.service';
import { INTERNAL_VALIDATION_RULES_TABLE } from '../migrations/nc_internal_004_product_suite';
import {
  internalValidationRulesSchema,
  type InternalFieldValidationConfiguration,
  type InternalValidationRule,
} from './internal-validation.types';

@Injectable()
export class InternalValidationRepository {
  constructor(private readonly metaService: MetaService) {}

  async list(
    workspaceId: string,
    baseId: string,
    modelId: string,
  ): Promise<InternalFieldValidationConfiguration[]> {
    const rows = await this.table()
      .where({
        workspace_id: workspaceId,
        base_id: baseId,
        model_id: modelId,
      })
      .orderBy('field_key', 'asc');
    return rows.map((row) => this.toModel(row));
  }

  async replace(
    input: {
      workspaceId: string;
      baseId: string;
      modelId: string;
      fieldKey: string;
      rules: InternalValidationRule[];
      expectedRevision?: number;
      actorId: string;
    },
    transaction?: Knex.Transaction,
  ): Promise<InternalFieldValidationConfiguration> {
    const rules = internalValidationRulesSchema.parse(input.rules);
    const table = this.table(transaction);
    const existing = await table
      .where({
        base_id: input.baseId,
        model_id: input.modelId,
        field_key: input.fieldKey,
      })
      .first();
    if (
      existing &&
      input.expectedRevision !== undefined &&
      Number(existing.revision) !== input.expectedRevision
    ) {
      throw new Error('STALE_VALIDATION_RULE');
    }
    const values = {
      workspace_id: input.workspaceId,
      base_id: input.baseId,
      model_id: input.modelId,
      field_key: input.fieldKey,
      rules: JSON.stringify(rules),
      revision: Number(existing?.revision ?? 0) + 1,
      updated_by: input.actorId,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      await table.where({ id: existing.id }).update(values);
    } else {
      await table.insert({
        id: nanoid(20),
        ...values,
      });
    }
    const saved = await table
      .where({
        base_id: input.baseId,
        model_id: input.modelId,
        field_key: input.fieldKey,
      })
      .first();
    return this.toModel(saved);
  }

  async isBaseFeatureDisabled(
    workspaceId: string,
    baseId: string,
  ): Promise<boolean> {
    const row = await this.metaService
      .knexConnection('nc_internal_base_features')
      .where({
        workspace_id: workspaceId,
        base_id: baseId,
        feature_key: 'inputValidation',
      })
      .first();
    return row ? !Boolean(row.enabled) : false;
  }

  private table(transaction?: Knex.Transaction) {
    return (transaction ?? this.metaService.knexConnection)(
      INTERNAL_VALIDATION_RULES_TABLE,
    );
  }

  private toModel(row: any): InternalFieldValidationConfiguration {
    const timestamp = (value: string | Date) =>
      (value instanceof Date ? value : new Date(value)).toISOString();
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      baseId: row.base_id,
      modelId: row.model_id,
      fieldKey: row.field_key,
      rules: internalValidationRulesSchema.parse(JSON.parse(row.rules)),
      revision: Number(row.revision),
      updatedBy: row.updated_by,
      createdAt: timestamp(row.created_at),
      updatedAt: timestamp(row.updated_at),
    };
  }
}
