jest.mock('~/models', () => ({
  MCPToken: { validateToken: jest.fn() },
  User: { getWithRoles: jest.fn() },
}));

import { ProjectRoles } from 'nocodb-sdk';
import { MCPToken, User } from '~/models';
import { McpTokenGuard } from './mcp-token.guard';

describe('McpTokenGuard', () => {
  const guard = new McpTokenGuard();
  const request = {
    headers: { 'xc-mcp-token': 'secret' },
    params: { mcpTokenId: 'mcp-1' },
    context: { workspace_id: 'workspace-1', base_id: 'base-1' },
  } as any;
  const executionContext = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    request.headers = { 'xc-mcp-token': 'secret' };
    request.user = undefined;
    (MCPToken.validateToken as jest.Mock).mockResolvedValue({
      fk_user_id: 'user-1',
      fk_workspace_id: 'workspace-1',
      base_id: 'base-1',
    });
    (User.getWithRoles as jest.Mock).mockResolvedValue({
      id: 'user-1',
      base_roles: { editor: true },
    });
  });

  it('resolves the MCP actor before interceptors run', async () => {
    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(request.user.id).toBe('user-1');
  });

  it('denies a missing token', async () => {
    request.headers = {};
    await expect(guard.canActivate(executionContext)).rejects.toMatchObject({
      code: 401,
    });
  });

  it('denies a user whose current base role is no access', async () => {
    (User.getWithRoles as jest.Mock).mockResolvedValue({
      id: 'user-1',
      base_roles: { [ProjectRoles.NO_ACCESS]: true },
    });
    await expect(guard.canActivate(executionContext)).rejects.toMatchObject({
      code: 403,
    });
  });
});
