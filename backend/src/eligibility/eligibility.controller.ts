import { Body, Controller, Get, HttpCode, Param, Put, Req, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import type { Request } from 'express';
import { cookie, IdentityCsrf, IdentityExceptionFilter, SESSION_COOKIE } from '../identity/identity-http';
import { accountId } from '../identity/identity-input';
import { booleanInput } from '../planning/planning-input';
import { availabilityInput } from './eligibility-input';
import { EligibilityService } from './eligibility.service';
import { TrainingService } from './training.service';

const minute = { type: 'integer', minimum: 0, maximum: 1440 } as const;
const intervals: SchemaObject = {
  type: 'array',
  items: { type: 'object', additionalProperties: false, required: ['startMinute', 'endMinute'],
    properties: { startMinute: minute, endMinute: minute } },
};
const availability: SchemaObject = {
  type: 'object', additionalProperties: false, required: ['weekly', 'exceptions'],
  properties: {
    weekly: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['weekday', 'intervals'],
      properties: { weekday: { type: 'integer', minimum: 1, maximum: 7 }, intervals } } },
    exceptions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['date', 'intervals'],
      properties: { date: { type: 'string', format: 'date' }, intervals } } },
  },
};

@ApiTags('Eligibility')
@ApiSecurity('session')
@UseGuards(IdentityCsrf)
@UseFilters(IdentityExceptionFilter)
@Controller('eligibility')
export class EligibilityController {
  constructor(private readonly eligibility: EligibilityService, private readonly training: TrainingService) {}

  @Get('availability')
  @ApiOperation({ summary: 'Read the authenticated volunteer’s own availability.' })
  @ApiResponse({ status: 200, schema: availability })
  @ApiResponse({ status: 401 })
  @ApiResponse({ status: 403 })
  read(@Req() request: Request) {
    return this.eligibility.availability(cookie(request, SESSION_COOKIE));
  }

  @Put('availability')
  @ApiOperation({ summary: 'Replace weekly availability and date exceptions.' })
  @ApiBody({ schema: availability })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiResponse({ status: 200, schema: availability })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 401 })
  @ApiResponse({ status: 403 })
  update(@Req() request: Request, @Body() body: unknown) {
    return this.eligibility.availability(cookie(request, SESSION_COOKIE), availabilityInput(body));
  }

  @Put('training-permissions/:coordinatorId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Grant or revoke a coordinator’s training permission as an administrator.' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false, required: ['granted'],
    properties: { granted: { type: 'boolean' } } } })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 401 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  permission(@Req() request: Request, @Param('coordinatorId') id: string, @Body() body: unknown) {
    return this.training.setPermission(cookie(request, SESSION_COOKIE), accountId(id), booleanInput(body, 'granted'));
  }
}
