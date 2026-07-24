import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { extractRolesObj, ProjectRoles } from 'nocodb-sdk';
import type { NcRequest } from 'nocodb-sdk';
import { MCPToken, User } from '~/models';
import { NcError } from '~/helpers/catchError';

/**
 * Authenticates MCP requests before global interceptors execute. Keeping token
 * validation in a guard lets both Community authorization and independently
 * enabled internal permission enforcement observe the same resolved actor.
 */
@Injectable()
export class McpTokenGuard implements CanActivate {
  async canActivate(executionContext: ExecutionContext) {
    const req = executionContext.switchToHttp().getRequest<NcRequest>();
    const tokenValue = req.headers['xc-mcp-token'];
    if (!tokenValue) {
      NcError.unauthorized('MCP token missing');
    }

    const tokenId = req.params.mcpTokenId;
    const mcpToken = await MCPToken.validateToken(
      req.context,
      tokenValue as string,
      tokenId,
    );

    req.user = (await User.getWithRoles(req.context, mcpToken.fk_user_id, {
      baseId: mcpToken.base_id,
      workspaceId: mcpToken.fk_workspace_id,
    })) as typeof req.user;

    if (extractRolesObj(req.user.base_roles)[ProjectRoles.NO_ACCESS]) {
      NcError.forbidden('User has no access');
    }
    return true;
  }
}
