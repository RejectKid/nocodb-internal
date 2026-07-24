import { Injectable } from '@nestjs/common';
import type { NcContext } from '~/interface/config';
import { MetaService } from '~/meta/meta.service';
import { Base, User } from '~/models';
import { CommunityBaseMembershipAdapter } from './community-base-membership.adapter';
import { InternalBasePermissionIdentityProvider } from './internal-base-permission-identity.provider';

@Injectable()
export class CommunityBasePermissionIdentityProvider extends InternalBasePermissionIdentityProvider {
  constructor(
    private readonly metaService: MetaService,
    private readonly adapter: CommunityBaseMembershipAdapter,
  ) {
    super();
  }

  async resolve(
    context: NcContext,
    workspaceId: string,
    baseId: string,
    userId: string,
  ) {
    const tenantContext = {
      ...context,
      workspace_id: workspaceId,
      base_id: baseId,
    };
    const base = await Base.get(tenantContext, baseId, this.metaService);
    if (!base || base.fk_workspace_id !== workspaceId) {
      return null;
    }
    const user = await User.getWithRoles(
      tenantContext,
      userId,
      { baseId, workspaceId },
      this.metaService,
    );
    return this.adapter.fromCommunityUser(user);
  }
}
