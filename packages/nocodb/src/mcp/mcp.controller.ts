import {
  All,
  Controller,
  Param,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { NcContext, NcRequest } from 'nocodb-sdk';
import { McpService } from '~/mcp/mcp.service';
import { TenantContext } from '~/decorators/tenant-context.decorator';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { RequireInternalBasePermissionFromRequest } from '~/modules/internal-extensions/permissions/internal-base-permission-enforcement.decorator';
import { InternalPermissionRequestKind } from '~/modules/internal-extensions/permissions/internal-request-permission-resolver';
import { McpTokenGuard } from '~/mcp/mcp-token.guard';

@Controller()
@UseGuards(MetaApiLimiterGuard, McpTokenGuard)
export class McpController {
  constructor(protected readonly mcpService: McpService) {}

  @All('mcp/:mcpTokenId')
  @RequireInternalBasePermissionFromRequest(InternalPermissionRequestKind.MCP)
  async handleMcpRequest(
    @Param('mcpTokenId') tokenId: string,
    @Request() req: NcRequest,
    @Response() res,
    @TenantContext() context: NcContext,
  ) {
    return await this.mcpService.handleRequest(tokenId, context, req, res);
  }
}
