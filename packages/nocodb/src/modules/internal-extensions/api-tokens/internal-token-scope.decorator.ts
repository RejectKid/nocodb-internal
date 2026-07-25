import { SetMetadata } from '@nestjs/common';
import type { InternalBasePermission } from '../permissions/internal-base-permission';
import type { InternalApiTokenScope } from './internal-api-token-scope';
import { INTERNAL_TOKEN_AUTHENTICATED_PERMISSION } from './internal-token-owner.provider';

export const INTERNAL_TOKEN_SCOPE_METADATA = 'nc.internal.token-scope' as const;

export type InternalTokenAuthorizationTargetKind =
  | 'instance'
  | 'workspace'
  | 'base';
export type InternalTokenRequiredOwnerPermission =
  | InternalBasePermission
  | typeof INTERNAL_TOKEN_AUTHENTICATED_PERMISSION;

export interface InternalTokenScopeMetadata {
  scope: InternalApiTokenScope;
  target: InternalTokenAuthorizationTargetKind;
  ownerPermission: InternalTokenRequiredOwnerPermission;
}

export const RequireInternalTokenScope = (
  scope: InternalApiTokenScope,
  target: InternalTokenAuthorizationTargetKind,
  ownerPermission: InternalTokenRequiredOwnerPermission,
) =>
  SetMetadata(
    INTERNAL_TOKEN_SCOPE_METADATA,
    Object.freeze({ scope, target, ownerPermission }),
  );
