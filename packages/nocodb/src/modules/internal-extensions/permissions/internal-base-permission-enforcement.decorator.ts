import { SetMetadata } from '@nestjs/common';
import type { InternalBasePermission } from './internal-base-permission';
import type { InternalPermissionRequestKind } from './internal-request-permission-resolver';

export const INTERNAL_BASE_PERMISSION_METADATA =
  'nc.internal.base-permission' as const;
export const INTERNAL_BASE_PERMISSION_REQUEST_METADATA =
  'nc.internal.base-permission-request' as const;

/**
 * Marks an upstream Community route for additional internal authorization.
 * The metadata is inert unless the independently registered interceptor is
 * enabled.
 */
export const RequireInternalBasePermission = (
  ...permissions: [InternalBasePermission, ...InternalBasePermission[]]
) =>
  SetMetadata(
    INTERNAL_BASE_PERMISSION_METADATA,
    Object.freeze([...permissions]),
  );

export const RequireInternalBasePermissionFromRequest = (
  kind: InternalPermissionRequestKind,
) => SetMetadata(INTERNAL_BASE_PERMISSION_REQUEST_METADATA, kind);
