import { BadRequestException, Injectable } from '@nestjs/common';
import {
  InternalAuditAction,
  InternalAuditResourceType,
} from '../audit/internal-audit-event';
import type { InternalAuditContext } from '../audit/internal-audit-event.model';
import { InternalAuditService } from '../audit/internal-audit.service';
import { InternalValidationEngine } from './internal-validation.engine';
import { InternalValidationRepository } from './internal-validation.repository';
import type { InternalValidationRule } from './internal-validation.types';

@Injectable()
export class InternalValidationService {
  constructor(
    private readonly repository: InternalValidationRepository,
    private readonly engine: InternalValidationEngine,
    private readonly audit: InternalAuditService,
  ) {}

  list(workspaceId: string, baseId: string, modelId: string) {
    return this.repository.list(workspaceId, baseId, modelId);
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
    auditContext: InternalAuditContext,
  ) {
    if (!input.fieldKey?.trim() || input.fieldKey.length > 255) {
      throw new BadRequestException('fieldKey is invalid');
    }
    try {
      for (const rule of input.rules) this.engine.assertRegexIsSafe(rule);
      return await this.audit.execute<
        import('./internal-validation.types').InternalFieldValidationConfiguration
      >(
        (result) => ({
          action: InternalAuditAction.VALIDATION_RULE_CHANGED,
          resourceType: InternalAuditResourceType.VALIDATION_RULE,
          resourceId: result.id,
          context: {
            ...auditContext,
            workspaceId: input.workspaceId,
            baseId: input.baseId,
          },
          after: {
            modelId: input.modelId,
            fieldKey: input.fieldKey,
            ruleTypes: result.rules.map((rule) => rule.type),
            revision: result.revision,
          },
        }),
        (transaction) => this.repository.replace(input, transaction),
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'STALE_VALIDATION_RULE') {
        throw new BadRequestException('Validation rule is stale');
      }
      if (
        error instanceof Error &&
        error.message === 'Unsafe regular expression'
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
