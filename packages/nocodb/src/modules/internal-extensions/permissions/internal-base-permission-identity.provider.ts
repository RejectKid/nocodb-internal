import type { NcContext } from '~/interface/config';
import type { InternalBasePermissionActor } from './internal-base-permission.policy';

export abstract class InternalBasePermissionIdentityProvider {
  abstract resolve(
    context: NcContext,
    workspaceId: string,
    baseId: string,
    userId: string,
  ): Promise<InternalBasePermissionActor | null>;
}
