import { Injectable } from '@nestjs/common';
import { MetaService } from '~/meta/meta.service';
import User from '~/models/User';
import {
  INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  type InternalTokenOwnerIdentity,
  InternalTokenOwnerProvider,
} from './internal-token-owner.provider';

@Injectable()
export class CommunityInternalTokenOwnerProvider extends InternalTokenOwnerProvider {
  constructor(private readonly metaService: MetaService) {
    super();
  }

  async load(userId: string): Promise<InternalTokenOwnerIdentity | null> {
    const user = await User.get(userId, this.metaService);
    if (!user) {
      return null;
    }

    const lifecycle = user as User & { disabled?: boolean };
    const state = lifecycle.is_deleted
      ? 'deleted'
      : lifecycle.disabled
      ? 'disabled'
      : lifecycle.blocked
      ? 'blocked'
      : 'active';

    return {
      authorization: {
        id: user.id,
        state,
        permissions: [INTERNAL_TOKEN_AUTHENTICATED_PERMISSION],
      },
      user: {
        id: user.id,
        email: user.email,
        email_verified: Boolean(user.email_verified),
        display_name: user.display_name,
      },
    };
  }
}
