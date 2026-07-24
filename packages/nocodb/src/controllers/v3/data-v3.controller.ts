import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { NcApiVersion } from 'nocodb-sdk';
import type {
  DataDeleteRequest,
  DataInsertRequest,
  DataRecord,
  DataUpdateRequest,
} from '~/services/v3/data-v3.types';
import { DataUpsertRequest } from '~/services/v3/data-v3.types';
import { Acl } from '~/middlewares/extract-ids/extract-ids.middleware';
import { parseHrtimeToMilliSeconds } from '~/helpers';
import { DataApiLimiterGuard } from '~/guards/data-api-limiter.guard';
import { GlobalGuard } from '~/guards/global/global.guard';
import { TenantContext } from '~/decorators/tenant-context.decorator';
import { NcContext, NcRequest } from '~/interface/config';
import { DataV3Service } from '~/services/v3/data-v3.service';
import { DataTableService } from '~/services/data-table.service';
import { DataAttachmentV3Service } from '~/services/v3/data-attachment-v3.service';
import { PREFIX_APIV3_DATA } from '~/constants/controllers';
// Internal fork modification: inert route metadata for independently
// implemented base-permission enforcement.
import { InternalBasePermission } from '~/modules/internal-extensions/permissions/internal-base-permission';
import { RequireInternalBasePermission } from '~/modules/internal-extensions/permissions/internal-base-permission-enforcement.decorator';

@Controller()
@UseGuards(DataApiLimiterGuard, GlobalGuard)
export class Datav3Controller {
  constructor(
    protected readonly dataV3Service: DataV3Service,
    protected readonly dataTableService: DataTableService,
    protected readonly dataAttachmentV3Service: DataAttachmentV3Service,
  ) {}

  @Get(`${PREFIX_APIV3_DATA}/:modelId/records`)
  @Acl('dataList')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_READ)
  async dataList(
    @TenantContext() context: NcContext,
    @Req() req: NcRequest,
    @Res() res: Response,
    @Param('baseName') baseName: string,
    @Param('modelId') modelId: string,
    @Query('viewId') viewId: string,
  ) {
    context.cache = true;
    const startTime = process.hrtime();
    const responseData = await this.dataV3Service.dataList(context, {
      query: req.query,
      modelId: modelId,
      viewId: viewId,
      req,
    });
    const elapsedSeconds = parseHrtimeToMilliSeconds(process.hrtime(startTime));
    res.setHeader('xc-db-response', elapsedSeconds);
    res.json(responseData);
  }

  @Post(`${PREFIX_APIV3_DATA}/:modelId/records/upsert`)
  @HttpCode(200)
  @Acl('dataUpsert')
  @RequireInternalBasePermission(
    InternalBasePermission.RECORDS_CREATE,
    InternalBasePermission.RECORDS_UPDATE,
  )
  async dataUpsert(
    @TenantContext() context: NcContext,
    @Req() req: NcRequest,
    @Param('modelId') modelId: string,
    @Body() body: DataUpsertRequest,
  ) {
    context.cache = true;
    return await this.dataV3Service.dataUpsert(context, {
      modelId: modelId,
      body: body,
      cookie: req,
    });
  }

  @Post(`${PREFIX_APIV3_DATA}/:modelId/records`)
  @HttpCode(200)
  @Acl('dataInsert')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_CREATE)
  async dataInsert(
    @TenantContext() context: NcContext,
    @Req() req: NcRequest,
    @Param('baseName') baseName: string,
    @Param('modelId') modelId: string,
    @Query('view_id') viewId: string,
    @Body() body: DataInsertRequest | DataInsertRequest[],
  ) {
    context.cache = true;
    return await this.dataV3Service.dataInsert(context, {
      modelId: modelId,
      body: body,
      viewId,
      cookie: req,
    });
  }

  @Post(
    `${PREFIX_APIV3_DATA}/:modelId/records/:recordId/fields/:columnId/upload`,
  )
  @HttpCode(200)
  @Acl('dataUpdate')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_UPDATE)
  async dataAttachmentUpload(
    @TenantContext() context: NcContext,
    @Req() req: NcRequest,
    @Param('modelId') modelId: string,
    @Param('recordId') recordId: string,
    @Param('columnId') columnId: string,
    @Body() body: { contentType: string; file: string; filename: string },
  ) {
    context.cache = true;
    return await this.dataAttachmentV3Service.appendBase64AttachmentToCellData({
      context,
      modelId,
      recordId,
      columnId,
      scope: undefined,
      attachment: body,
      req,
    });
  }

  @Delete(`${PREFIX_APIV3_DATA}/:modelId/records`)
  @Acl('dataDelete')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_DELETE)
  async dataDelete(
    @TenantContext() context: NcContext,
    @Req() req: NcRequest,
    @Param('baseName') baseName: string,
    @Param('modelId') modelId: string,
    @Query('view_id') viewId: string,
    @Body() body: DataDeleteRequest | DataDeleteRequest[],
    @Query('records') records: string | string[],
  ) {
    context.cache = true;
    return await this.dataV3Service.dataDelete(context, {
      modelId: modelId,
      cookie: req,
      viewId,
      body,
      queryRecords: records,
    });
  }

  @Patch(`${PREFIX_APIV3_DATA}/:modelId/records`)
  @Acl('dataUpdate')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_UPDATE)
  async dataUpdate(
    @TenantContext() context: NcContext,
    @Req() req: NcRequest,
    @Param('baseName') baseName: string,
    @Param('modelId') modelId: string,
    @Query('view_id') viewId: string,
    @Body() body: DataUpdateRequest | DataUpdateRequest[],
  ) {
    context.cache = true;
    return await this.dataV3Service.dataUpdate(context, {
      modelId: modelId,
      body: body,
      cookie: req,
      viewId,
    });
  }

  @Get(`${PREFIX_APIV3_DATA}/:modelId/links/:columnId/:rowId`)
  @Acl('nestedDataList')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_READ)
  async nestedDataList(
    @TenantContext() context: NcContext,
    @Req() req: NcRequest,
    @Param('baseName') baseName: string,
    @Param('modelId') modelId: string,
    @Query('viewId') viewId: string,
    @Param('columnId') columnId: string,
    @Param('rowId') rowId: string,
  ) {
    context.cache = true;
    return await this.dataV3Service.nestedDataList(context, {
      modelId,
      rowId: rowId,
      query: req.query,
      viewId,
      columnId,
      req,
    });
  }

  @Post(`${PREFIX_APIV3_DATA}/:modelId/links/:columnId/:rowId`)
  @HttpCode(200)
  @Acl('nestedDataLink')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_UPDATE)
  async nestedLink(
    @TenantContext() context: NcContext,
    @Req() req: NcRequest,
    @Param('baseName') baseName: string,
    @Param('modelId') modelId: string,
    @Query('view_id') viewId: string,
    @Param('columnId') columnId: string,
    @Param('rowId') rowId: string,
    @Body()
    refRowIds:
      | string
      | string[]
      | number
      | number[]
      | Record<string, any>
      | Record<string, any>[],
  ) {
    context.cache = true;
    return await this.dataV3Service.nestedLink(context, {
      modelId,
      rowId: rowId,
      query: req.query,
      viewId,
      columnId,
      refRowIds,
      cookie: req,
    });
  }

  @Delete(`${PREFIX_APIV3_DATA}/:modelId/links/:columnId/:rowId`)
  @Acl('nestedDataUnlink')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_UPDATE)
  async nestedUnlink(
    @TenantContext() context: NcContext,
    @Req() req: NcRequest,
    @Param('baseName') baseName: string,
    @Param('modelId') modelId: string,
    @Query('view_id') viewId: string,
    @Param('columnId') columnId: string,
    @Param('rowId') rowId: string,
    @Body()
    refRowIds:
      | string
      | string[]
      | number
      | number[]
      | Record<string, any>
      | Record<string, any>[],
  ) {
    context.cache = true;
    return await this.dataV3Service.nestedUnlink(context, {
      modelId,
      rowId: rowId,
      query: req.query,
      viewId,
      columnId,
      refRowIds,
      cookie: req,
    });
  }

  @Get(`${PREFIX_APIV3_DATA}/:modelId/count`)
  @Acl('dataCount')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_READ)
  async dataCount(
    @TenantContext() context: NcContext,
    @Req() req: NcRequest,
    @Res() res: Response,
    @Param('baseName') baseName: string,
    @Param('modelId') modelId: string,
    @Query('viewId') viewId: string,
  ) {
    context.cache = true;
    const countResult = await this.dataTableService.dataCount(context, {
      query: req.query,
      modelId,
      viewId,
      apiVersion: NcApiVersion.V3,
    });

    res.json(countResult);
  }
  @Get(`${PREFIX_APIV3_DATA}/:modelId/records/:rowId`)
  @Acl('dataRead')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_READ)
  async dataRead(
    @TenantContext() context: NcContext,
    @Req() req: NcRequest,
    @Param('baseName') baseName: string,
    @Param('modelId') modelId: string,
    @Query('view_id') viewId: string,
    @Param('rowId') rowId: string,
  ): Promise<DataRecord> {
    context.cache = true;
    return await this.dataV3Service.dataRead(context, {
      modelId,
      rowId: rowId,
      query: req.query,
      viewId,
      req,
    });
  }
}
