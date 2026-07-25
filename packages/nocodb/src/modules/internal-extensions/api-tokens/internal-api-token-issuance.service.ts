import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import type { Knex } from 'knex';
import { InternalApiTokenScope } from './internal-api-token-scope';
import type {
  InternalApiTokenRecord,
  InternalApiTokenSummary,
} from './internal-api-token.model';
import {
  InternalApiTokenPrefixConflictError,
  InternalApiTokenRepository,
} from './internal-api-token.repository';
import { InternalTokenHashingService } from './internal-token-hashing.service';

const HASH_VERSION = 1;
const SCOPE_VERSION = 1;
const MAX_PREFIX_ATTEMPTS = 5;
const MAX_BOUNDARY_IDS = 1_000;
const MAX_METADATA_BYTES = 16 * 1024;
const SUPPORTED_SCOPES = new Set<string>(Object.values(InternalApiTokenScope));
const TOKEN_PREFIX_PATTERN = /^nci_[A-Za-z0-9_-]{12}$/;
const TOKEN_VALUE_PATTERN = /^nci_[A-Za-z0-9_-]{12}_[A-Za-z0-9_-]{43}$/;

export interface CreateInternalApiTokenRequest {
  userId: string;
  displayName: string;
  createdBy: string;
  expiresAt?: Date | null;
  allowedWorkspaceIds?: string[];
  allowedBaseIds?: string[];
  scopes?: InternalApiTokenScope[];
  metadata?: Record<string, unknown> | null;
}

export interface IssuedInternalApiToken {
  token: InternalApiTokenSummary;
  value: string;
}

export class InternalApiTokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalApiTokenValidationError';
  }
}

function normalizeIdentifier(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 20) {
    throw new InternalApiTokenValidationError(
      `${field} must contain between 1 and 20 characters`,
    );
  }
  return normalized;
}

function normalizeIdentifierList(values: string[], field: string): string[] {
  if (values.length > MAX_BOUNDARY_IDS) {
    throw new InternalApiTokenValidationError(
      `${field} cannot contain more than ${MAX_BOUNDARY_IDS} identifiers`,
    );
  }
  return Array.from(
    new Set(values.map((value) => normalizeIdentifier(value, field))),
  );
}

function normalizeScopes(scopes: InternalApiTokenScope[]) {
  const invalid = scopes.find((scope) => !SUPPORTED_SCOPES.has(scope));
  if (invalid) {
    throw new InternalApiTokenValidationError(
      `Unsupported internal token scope: ${invalid}`,
    );
  }
  return Array.from(new Set(scopes));
}

function cloneMetadata(
  metadata: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (metadata === null) {
    return null;
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(metadata);
  } catch {
    throw new InternalApiTokenValidationError(
      'metadata must be JSON serializable',
    );
  }

  if (
    serialized === undefined ||
    Buffer.byteLength(serialized) > MAX_METADATA_BYTES
  ) {
    throw new InternalApiTokenValidationError(
      `metadata cannot exceed ${MAX_METADATA_BYTES} bytes`,
    );
  }

  const cloned = JSON.parse(serialized);
  if (!cloned || Array.isArray(cloned) || typeof cloned !== 'object') {
    throw new InternalApiTokenValidationError('metadata must be an object');
  }
  return cloned;
}

@Injectable()
export class InternalApiTokenIssuanceService {
  constructor(
    private readonly repository: InternalApiTokenRepository,
    private readonly hashingService: InternalTokenHashingService,
  ) {}

  async create(
    request: CreateInternalApiTokenRequest,
    transaction?: Knex.Transaction,
  ): Promise<IssuedInternalApiToken> {
    const now = new Date();
    const userId = normalizeIdentifier(request.userId, 'userId');
    const createdBy = normalizeIdentifier(request.createdBy, 'createdBy');
    const displayName = request.displayName.trim();
    if (!displayName || displayName.length > 255) {
      throw new InternalApiTokenValidationError(
        'displayName must contain between 1 and 255 characters',
      );
    }

    const expiresAt = request.expiresAt ?? null;
    if (
      expiresAt !== null &&
      (Number.isNaN(expiresAt.getTime()) ||
        expiresAt.getTime() <= now.getTime())
    ) {
      throw new InternalApiTokenValidationError(
        'expiresAt must be a valid future date',
      );
    }

    const allowedWorkspaceIds = normalizeIdentifierList(
      request.allowedWorkspaceIds ?? [],
      'allowedWorkspaceIds',
    );
    const allowedBaseIds = normalizeIdentifierList(
      request.allowedBaseIds ?? [],
      'allowedBaseIds',
    );
    const scopes = normalizeScopes(request.scopes ?? []);
    const metadata = cloneMetadata(request.metadata ?? null);

    for (let attempt = 0; attempt < MAX_PREFIX_ATTEMPTS; attempt += 1) {
      const generated = this.hashingService.generate();
      if (
        !TOKEN_PREFIX_PATTERN.test(generated.prefix) ||
        !TOKEN_VALUE_PATTERN.test(generated.value) ||
        !generated.value.startsWith(`${generated.prefix}_`)
      ) {
        throw new Error('Internal token generator returned an invalid format');
      }
      if (
        metadata !== null &&
        JSON.stringify(metadata).includes(generated.value)
      ) {
        throw new InternalApiTokenValidationError(
          'metadata cannot contain token material',
        );
      }
      if (await this.repository.findByPrefix(generated.prefix, transaction)) {
        continue;
      }

      const record: InternalApiTokenRecord = {
        id: nanoid(20),
        user_id: userId,
        display_name: displayName,
        token_hash: await this.hashingService.hash(generated.value),
        token_prefix: generated.prefix,
        hash_version: HASH_VERSION,
        created_at: now.toISOString(),
        created_by: createdBy,
        expires_at: expiresAt?.toISOString() ?? null,
        last_used_at: null,
        revoked_at: null,
        revoked_by: null,
        allowed_workspace_ids: allowedWorkspaceIds,
        allowed_base_ids: allowedBaseIds,
        scopes,
        scope_version: SCOPE_VERSION,
        metadata,
      };

      try {
        const inserted = await this.repository.insert(record, transaction);
        return {
          token: inserted.toSummary(),
          value: generated.value,
        };
      } catch (error) {
        if (error instanceof InternalApiTokenPrefixConflictError) {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Unable to allocate a unique internal API token prefix');
  }
}
