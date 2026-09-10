/** Narrow live-membership boundary for authorization; no Community runtime imports. */
export abstract class InternalTeamDirectory {
  abstract teamIdsForUser(
    workspaceId: string,
    userId: string,
  ): Promise<string[]>;
  abstract assertAssignable(workspaceId: string, teamId: string): Promise<void>;
}
