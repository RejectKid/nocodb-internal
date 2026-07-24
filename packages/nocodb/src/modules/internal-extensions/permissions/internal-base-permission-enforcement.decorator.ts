import { SetMetadata } from '@nestjs/common';
import type { InternalBasePermission } from './internal-base-permission';

export const INTERNAL_BASE_PERMISSION_METADATA =
  'nc.internal.base-permission' as const;

/**
 * Marks an upstream Community route for additional internal authorization.
 * The metadata is inert unless the independently registered interceptor is
 * enabled.
 */
export const RequireInternalBasePermission = (
  permission: InternalBasePermission,
) => SetMetadata(INTERNAL_BASE_PERMISSION_METADATA, permission);
