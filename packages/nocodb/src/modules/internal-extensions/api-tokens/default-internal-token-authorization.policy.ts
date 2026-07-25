import { Injectable } from '@nestjs/common';
import { InternalApiTokenScope } from './internal-api-token-scope';
import {
  type InternalTokenAuthenticationRequest,
  type InternalTokenAuthorizationDecision,
  type InternalTokenAuthorizationDeniedReason,
  type InternalTokenAuthorizationRequest,
  InternalTokenAuthorizationPolicy,
} from './internal-token-authorization.policy';

export const INTERNAL_TOKEN_SCOPE_VERSION = 1;

const SUPPORTED_SCOPES = new Set<string>(Object.values(InternalApiTokenScope));

const allowedDecision: InternalTokenAuthorizationDecision = Object.freeze({
  allowed: true,
  failureClass: 'none',
  reason: 'allowed',
});

function denyAuthentication(
  reason: InternalTokenAuthorizationDeniedReason,
): InternalTokenAuthorizationDecision {
  return {
    allowed: false,
    failureClass: 'authentication',
    reason,
  };
}

function denyAuthorization(
  reason: InternalTokenAuthorizationDeniedReason,
): InternalTokenAuthorizationDecision {
  return {
    allowed: false,
    failureClass: 'authorization',
    reason,
  };
}

@Injectable()
export class DefaultInternalTokenAuthorizationPolicy extends InternalTokenAuthorizationPolicy {
  async authenticate(
    request: InternalTokenAuthenticationRequest,
  ): Promise<InternalTokenAuthorizationDecision> {
    const { token, owner, now } = request;

    if (token.isRevoked()) {
      return denyAuthentication('revoked');
    }
    if (token.isExpiredAt(now)) {
      return denyAuthentication('expired');
    }
    if (token.record.scope_version !== INTERNAL_TOKEN_SCOPE_VERSION) {
      return denyAuthentication('unsupported_scope_version');
    }
    if (!token.record.scopes.every((scope) => SUPPORTED_SCOPES.has(scope))) {
      return denyAuthentication('invalid_scope_set');
    }
    if (!owner) {
      return denyAuthentication('owner_not_found');
    }
    if (owner.id !== token.record.user_id) {
      return denyAuthentication('owner_mismatch');
    }
    if (owner.state !== 'active') {
      return denyAuthentication(`owner_${owner.state}`);
    }

    return allowedDecision;
  }

  async authorize(
    request: InternalTokenAuthorizationRequest,
  ): Promise<InternalTokenAuthorizationDecision> {
    const {
      token,
      owner,
      requiredScope,
      requiredOwnerPermission,
      target,
      now,
    } = request;

    const authentication = await this.authenticate({ token, owner, now });
    if (!authentication.allowed) {
      return authentication;
    }
    if (!SUPPORTED_SCOPES.has(requiredScope)) {
      return denyAuthorization('unsupported_required_scope');
    }
    // authenticate() guarantees a current, active owner.
    if (!owner) {
      return denyAuthentication('owner_not_found');
    }
    if (
      !requiredOwnerPermission ||
      !owner.permissions.includes(requiredOwnerPermission)
    ) {
      return denyAuthorization('owner_permission_missing');
    }
    if (!token.record.scopes.includes(requiredScope)) {
      return denyAuthorization('scope_missing');
    }

    if (target.kind === 'instance') {
      return allowedDecision;
    }
    if (!target.workspaceId) {
      return denyAuthorization('workspace_context_missing');
    }
    if (!token.record.allowed_workspace_ids.includes(target.workspaceId)) {
      return denyAuthorization('workspace_not_allowed');
    }
    if (target.kind === 'workspace') {
      return allowedDecision;
    }
    if (!target.baseId) {
      return denyAuthorization('base_context_missing');
    }
    if (!token.record.allowed_base_ids.includes(target.baseId)) {
      return denyAuthorization('base_not_allowed');
    }

    return allowedDecision;
  }
}
