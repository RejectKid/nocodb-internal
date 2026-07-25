import type { InternalTokenOwnerContext } from './internal-token-authorization.policy';

export const INTERNAL_TOKEN_AUTHENTICATED_PERMISSION = 'authenticated' as const;

export interface InternalTokenOwnerIdentity {
  authorization: InternalTokenOwnerContext;
  user: {
    id: string;
    email: string;
    email_verified: boolean;
    display_name?: string;
  };
}

export abstract class InternalTokenOwnerProvider {
  abstract load(userId: string): Promise<InternalTokenOwnerIdentity | null>;
}
