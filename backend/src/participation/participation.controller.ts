import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Req, Sse, UseFilters, UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiProduces, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import type { Request } from 'express';
import { exhaustMap, from, mergeMap, startWith, timer } from 'rxjs';
import { parseCalendarDate } from '../eligibility/eligibility-rules';
import { TrainingService } from '../eligibility/training.service';
import { cookie, IdentityCsrf, IdentityExceptionFilter, SESSION_COOKIE } from '../identity/identity-http';
import { accountId, input } from '../identity/identity-input';
import { booleanInput, text } from '../planning/planning-input';
import { ParticipationService } from './participation.service';
import { participationLinks } from './participation-store';

function session(request: Request) { return cookie(request, SESSION_COOKIE); }

function bodyId(value: unknown) {
  if (typeof value !== 'string') throw new BadRequestException('Invalid identifier.');
  return accountId(value);
}

const uuid = { type: 'string', format: 'uuid' } as const;
const note = { type: 'string', maxLength: 1000 } as const;
const csrf = { name: 'X-CSRF-Token', required: true } as const;
const reasonBody = { type: 'object', additionalProperties: false, required: ['reason'], properties: { reason: note } } as const;
const placement: SchemaObject = {
  type: 'object', properties: {
    id: uuid, requestId: uuid, positionId: uuid, replacesId: { ...uuid, nullable: true },
    state: { type: 'string', enum: ['PROPOSED', 'QUEUED', 'SUSPENDED', 'OFFERED', 'CONFIRMED', 'DECLINED',
      'EXPIRED', 'WITHDRAWN', 'CANCELED', 'REPLACED'] },
    expiresAt: { type: 'string', format: 'date-time', nullable: true },
    reviewIssues: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'requestId', 'positionId', 'replacesId', 'state', 'expiresAt', 'reviewIssues'],
  additionalProperties: false,
};
const requestRecord: SchemaObject = {
  type: 'object', additionalProperties: false, required: ['id', 'eventId', 'accountId', 'createdAt', 'closedAt'],
  properties: { id: uuid, eventId: uuid, accountId: uuid,
    createdAt: { type: 'string', format: 'date-time' }, closedAt: { type: 'string', format: 'date-time', nullable: true } },
};
const requestList: SchemaObject = { type: 'array', items: {
  ...requestRecord,
  required: [...requestRecord.required!, 'placements'],
  properties: { ...requestRecord.properties, placements: { type: 'array', items: placement } },
} };
const notificationList: SchemaObject = { type: 'array', items: {
  type: 'object', additionalProperties: false, required: ['id', 'eventId', 'subjectId', 'kind'],
  properties: { id: { type: 'string', pattern: '^[0-9]+$' }, eventId: uuid, subjectId: uuid, kind: { type: 'string' } },
} };

@ApiTags('Participation')
@ApiSecurity('session')
@ApiResponse({ status: 401, description: 'Session required.' })
@ApiResponse({ status: 403, description: 'Permission or request proof missing.' })
@ApiResponse({ status: 404, description: 'Resource not available.' })
@ApiResponse({ status: 409, description: 'Participation rules prevent this operation.' })
@UseGuards(IdentityCsrf)
@UseFilters(IdentityExceptionFilter)
@Controller('participation')
export class ParticipationController {
  constructor(private readonly service: ParticipationService) {}

  @Post('events/:eventId/requests')
  @ApiOperation({ summary: 'Open or retrieve the volunteer’s active request for an event.' })
  @ApiHeader(csrf)
  @ApiResponse({ status: 201, schema: requestRecord })
  open(@Req() req: Request, @Param('eventId') id: string) {
    return this.service.open(session(req), accountId(id));
  }

  @Get('me')
  @ApiOperation({ summary: 'Read the volunteer’s own requests and placements.' })
  @ApiResponse({ status: 200, schema: requestList })
  mine(@Req() req: Request) { return this.service.mine(session(req)); }

  @Get('events/:eventId')
  @ApiOperation({ summary: 'Read requests for an assigned event.' })
  @ApiResponse({ status: 200, schema: requestList })
  staff(@Req() req: Request, @Param('eventId') id: string) {
    return this.service.staff(session(req), accountId(id));
  }

  @Delete('requests/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Withdraw a request and its pending placements.' })
  @ApiHeader(csrf)
  withdrawRequest(@Req() req: Request, @Param('id') id: string) {
    return this.service.withdrawRequest(session(req), accountId(id));
  }

  @Post('requests/:id/proposals')
  @ApiOperation({ summary: 'Propose a position, optionally replacing a confirmed placement.' })
  @ApiHeader(csrf)
  @ApiBody({ schema: { type: 'object', additionalProperties: false, required: ['positionId'],
    properties: { positionId: uuid, replacesId: uuid } } })
  @ApiResponse({ status: 201, schema: placement })
  propose(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { positionId, replacesId } = input(body, ['positionId', 'replacesId']);
    return this.service.propose(session(req), accountId(id), bodyId(positionId),
      replacesId === undefined ? undefined : bodyId(replacesId));
  }

  @Put('placements/:id/response')
  @ApiOperation({ summary: 'Accept or decline a proposal or offer.' })
  @ApiHeader(csrf)
  @ApiBody({ schema: { type: 'object', additionalProperties: false, required: ['accept'], properties: { accept: { type: 'boolean' } } } })
  @ApiResponse({ status: 200, schema: placement })
  respond(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.service.respond(session(req), accountId(id), booleanInput(body, 'accept'));
  }

  @Post('placements/:id/rejoin')
  @ApiOperation({ summary: 'Rejoin the previously authorized queue at its tail.' })
  @ApiHeader(csrf)
  @ApiResponse({ status: 201, schema: placement })
  rejoin(@Req() req: Request, @Param('id') id: string) { return this.service.rejoin(session(req), accountId(id)); }

  @Put('placements/:id/withdraw')
  @HttpCode(204)
  @ApiOperation({ summary: 'Withdraw a placement. A coordinator supplies a reason.' })
  @ApiHeader(csrf)
  @ApiBody({ required: false, schema: { type: 'object', properties: { reason: note }, additionalProperties: false } })
  withdraw(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { reason } = body === undefined ? {} : input(body, ['reason']);
    return this.service.withdrawPlacement(session(req), accountId(id), reason === undefined ? undefined : text(reason, 1000));
  }

  @Post('events/:eventId/shifts/:shiftId/cancel')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cancel an upcoming shift with a recorded reason.' })
  @ApiHeader(csrf)
  @ApiBody({ schema: { ...reasonBody, required: ['reason'] } })
  cancel(@Req() req: Request, @Param('eventId') eventId: string, @Param('shiftId') shiftId: string, @Body() body: unknown) {
    const { reason } = input(body, ['reason']);
    return this.service.cancelShift(session(req), accountId(eventId), accountId(shiftId), text(reason, 1000));
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Read recent committed notifications for the authenticated recipient.' })
  @ApiResponse({ status: 200, schema: notificationList })
  notifications(@Req() req: Request) { return this.service.notifications(session(req)); }

  @Sse('updates')
  @ApiOperation({ summary: 'Stream committed participation changes. Reload current state through REST on reconnect.' })
  @ApiProduces('text/event-stream')
  @ApiResponse({ status: 200, description: 'Committed change notifications.' })
  async updates(@Req() req: Request) {
    const token = session(req);
    let seen = new Set((await this.service.notifications(token)).map(({ id }) => id));
    return timer(0, 1000).pipe(
      exhaustMap(async () => {
        const rows = await this.service.notifications(token);
        // Committing transactions may deliver a lower sequence number after a higher one.
        const changed = rows.filter(({ id }) => !seen.has(id)).reverse();
        seen = new Set(rows.map(({ id }) => id));
        return changed;
      }),
      mergeMap((rows) => from(rows.map((row) => ({ type: 'participation', id: row.id, data: row })))),
      startWith({ type: 'ready', data: {} }),
    );
  }
}

@ApiTags('Eligibility')
@ApiSecurity('session')
@UseGuards(IdentityCsrf)
@UseFilters(IdentityExceptionFilter)
@Controller('eligibility/volunteers/:volunteerId/trainings')
export class ParticipationTrainingController {
  constructor(private readonly training: TrainingService) {}

  @Post()
  @ApiOperation({ summary: 'Confirm training for a volunteer with a current participation link.' })
  @ApiHeader(csrf)
  @ApiBody({ schema: { type: 'object', additionalProperties: false,
    required: ['type', 'domain', 'trainer', 'completedOn', 'roleIds'], properties: {
      type: { type: 'string', enum: ['GENERAL', 'SPECIALIZED'] }, domain: { type: 'string' },
      trainer: { type: 'string' }, completedOn: { type: 'string', format: 'date' }, renewsRecordId: uuid,
      roleIds: { type: 'array', items: { type: 'string' } },
    } } })
  confirm(@Req() req: Request, @Param('volunteerId') id: string, @Body() body: unknown) {
    const row = input(body, ['type', 'domain', 'trainer', 'completedOn', 'roleIds', 'renewsRecordId']);
    const completedOn = parseCalendarDate(row.completedOn);
    if ((row.type !== 'GENERAL' && row.type !== 'SPECIALIZED') || !completedOn || !Array.isArray(row.roleIds)) {
      throw new BadRequestException('Invalid training record.');
    }
    return this.training.confirm(session(req), accountId(id), {
      type: row.type, completedOn, domain: text(row.domain, 250), trainer: text(row.trainer, 200),
      roleIds: row.roleIds.map((roleId: unknown) => text(roleId, 120)),
      renewsRecordId: row.renewsRecordId === undefined ? undefined : bodyId(row.renewsRecordId),
    }, participationLinks);
  }

  @Put(':recordId/renewal')
  @HttpCode(204)
  @ApiOperation({ summary: 'Request training renewal.' })
  @ApiHeader(csrf)
  renew(@Req() req: Request, @Param('volunteerId') id: string, @Param('recordId') recordId: string) {
    return this.training.requestRenewal(session(req), accountId(id), accountId(recordId), participationLinks);
  }

  @Put(':recordId/cancel')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cancel a training record with an audited reason.' })
  @ApiHeader(csrf)
  @ApiBody({ schema: { ...reasonBody, required: ['reason'] } })
  cancel(@Req() req: Request, @Param('volunteerId') id: string, @Param('recordId') recordId: string, @Body() body: unknown) {
    return this.training.cancel(session(req), accountId(id), accountId(recordId),
      text(input(body, ['reason']).reason, 1000), participationLinks);
  }
}
