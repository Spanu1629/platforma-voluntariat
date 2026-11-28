import {
  applyDecorators, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Req, UseFilters, UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import type { Request } from 'express';
import { cookie, IdentityCsrf, IdentityExceptionFilter, SESSION_COOKIE } from '../identity/identity-http';
import { accountId, input } from '../identity/identity-input';
import { booleanInput, eventInput, locationInput, positionInput, shiftInput } from './planning-input';
import { PlanningService } from './planning.service';

const id = { type: 'string', format: 'uuid' } as const;
const dateTime = { type: 'string', format: 'date-time' } as const;
const string = { type: 'string' } as const;
const nullableString = { ...string, nullable: true };
const nullableDateTime = { ...dateTime, nullable: true };
const arrayOf = (items: SchemaObject): SchemaObject => ({ type: 'array', items });
const bodySchema = (properties: SchemaObject['properties'], required?: string[]): SchemaObject => ({
  type: 'object', additionalProperties: false, properties, ...(required ? { required } : {}),
});
const eventBody = bodySchema({ title: nullableString, description: nullableString });
const locationBody = bodySchema({ name: string, address: nullableString }, ['name']);
const times = { startsAt: dateTime, endsAt: dateTime };
const shiftBody = bodySchema({
  locationId: { ...id, nullable: true },
  startsAt: { ...dateTime, nullable: true },
  endsAt: { ...dateTime, nullable: true },
  breaks: { type: 'array', items: bodySchema(times, ['startsAt', 'endsAt']) },
});
const positionBody = bodySchema({ capacity: { type: 'integer', minimum: 0 }, tasks: nullableString });
const newShiftBody = bodySchema({
  ...shiftBody.properties,
  positions: { type: 'array', items: bodySchema({
    ...positionBody.properties, roleId: string,
  }, ['roleId', 'capacity']) },
});
const confirmationBody = bodySchema({ confirmed: { type: 'boolean' } }, ['confirmed']);
const publicLocation = bodySchema({ id, name: string, address: nullableString }, ['id', 'name', 'address']);
const publicRole = bodySchema({ id: string, name: string }, ['id', 'name']);
const publicShift = bodySchema({
  id, ...times, location: publicLocation, roles: { type: 'array', items: publicRole },
}, ['id', 'startsAt', 'endsAt', 'location', 'roles']);
const publicEvent = bodySchema({
  id, title: string, description: string, shifts: { type: 'array', items: publicShift },
}, ['id', 'title', 'description', 'shifts']);

const staffSummary = bodySchema({
  id, title: nullableString, description: nullableString, publishedAt: nullableDateTime,
}, ['id', 'title', 'description', 'publishedAt']);
const staffEvent = bodySchema({ ...staffSummary.properties, organizationId: string },
  [...staffSummary.required!, 'organizationId']);
const staffLocation = bodySchema({ ...publicLocation.properties, eventId: id }, [...publicLocation.required!, 'eventId']);
const confirmation = bodySchema({ actorId: id, confirmedAt: dateTime }, ['actorId', 'confirmedAt']);
const position = bodySchema({
  id, roleId: string, capacity: { type: 'integer', minimum: 0 }, tasks: nullableString,
  adequacy: { ...confirmation, nullable: true }, supervision: { ...confirmation, nullable: true },
}, ['id', 'roleId', 'capacity', 'tasks', 'adequacy', 'supervision']);
const staffShift = bodySchema({
  id, eventId: id, locationId: { ...id, nullable: true }, startsAt: nullableDateTime, endsAt: nullableDateTime,
  breaks: arrayOf(bodySchema(times, ['startsAt', 'endsAt'])),
}, ['id', 'eventId', 'locationId', 'startsAt', 'endsAt', 'breaks']);
const detailedEvent = bodySchema({
  ...staffEvent.properties,
  locations: arrayOf(staffLocation),
  coordinators: arrayOf(bodySchema({ accountId: id, revokedAt: nullableDateTime }, ['accountId', 'revokedAt'])),
  shifts: arrayOf(bodySchema({ ...staffShift.properties, positions: arrayOf(position) }, [...staffShift.required!, 'positions'])),
}, [...staffEvent.required!, 'locations', 'coordinators', 'shifts']);
const staffRole = bodySchema({
  ...publicRole.properties, organizationId: string, minimumAge: { type: 'integer' },
  specializedTraining: { type: 'boolean' }, supervisionForMinors: { type: 'boolean' },
}, ['id', 'name', 'organizationId', 'minimumAge', 'specializedTraining', 'supervisionForMinors']);

function Session(summary: string, status = 200, writes = false, schema?: SchemaObject) {
  const decorators = [
    ApiOperation({ summary }), ApiSecurity('session'), ApiResponse({ status, ...(schema ? { schema } : {}) }),
    ApiResponse({ status: 401, description: 'Session required.' }),
    ApiResponse({ status: 403, description: 'Insufficient permission or invalid CSRF proof.' }),
    ApiResponse({ status: 404, description: 'Resource not available.' }),
  ];
  if (writes) decorators.push(
    ApiHeader({ name: 'X-CSRF-Token', required: true }),
    ApiResponse({ status: 400, description: 'Invalid request.' }),
    ApiResponse({ status: 409, description: 'Planning rules prevent this operation.' }),
  );
  return applyDecorators(...decorators);
}

function session(request: Request) {
  return cookie(request, SESSION_COOKIE);
}

@ApiTags('Events')
@UseFilters(IdentityExceptionFilter)
@Controller('events')
export class EventsController {
  constructor(private readonly planning: PlanningService) {}

  @Get()
  @ApiOperation({ summary: 'List published events.' })
  @ApiResponse({ status: 200, schema: { type: 'array', items: publicEvent } })
  list() {
    return this.planning.published();
  }

  @Get(':eventId')
  @ApiOperation({ summary: 'Read a published event.' })
  @ApiResponse({ status: 200, schema: publicEvent })
  @ApiResponse({ status: 404 })
  detail(@Param('eventId') eventId: string) {
    return this.planning.published(accountId(eventId));
  }
}

@ApiTags('Planning')
@UseGuards(IdentityCsrf)
@UseFilters(IdentityExceptionFilter)
@Controller('planning')
export class PlanningController {
  constructor(private readonly planning: PlanningService) {}

  @Get('events')
  @Session('List managed events.', 200, false, arrayOf(staffSummary))
  list(@Req() request: Request) {
    return this.planning.staffEvents(session(request));
  }

  @Get('roles')
  @Session('List the organization’s approved volunteer roles.', 200, false, arrayOf(staffRole))
  roles(@Req() request: Request) {
    return this.planning.roles(session(request));
  }

  @Get('events/:eventId')
  @Session('Read an authorized event plan.', 200, false, detailedEvent)
  detail(@Req() request: Request, @Param('eventId') eventId: string) {
    return this.planning.staffEvent(session(request), accountId(eventId));
  }

  @Post('events')
  @Session('Create an event draft.', 201, true, staffEvent)
  @ApiBody({ schema: eventBody })
  create(@Req() request: Request, @Body() body: unknown) {
    return this.planning.createEvent(session(request), eventInput(body));
  }

  @Patch('events/:eventId')
  @Session('Update an event.', 200, true, staffEvent)
  @ApiBody({ schema: eventBody })
  edit(@Req() request: Request, @Param('eventId') eventId: string, @Body() body: unknown) {
    return this.planning.editEvent(session(request), accountId(eventId), eventInput(body));
  }

  @Post('events/:eventId/publish')
  @HttpCode(204)
  @Session('Publish a valid event.', 204, true)
  publish(@Req() request: Request, @Param('eventId') eventId: string, @Body() body: unknown) {
    if (body !== undefined) input(body, []);
    return this.planning.publish(session(request), accountId(eventId));
  }

  @Put('events/:eventId/coordinators/:coordinatorId')
  @HttpCode(204)
  @Session('Assign a coordinator as an administrator.', 204, true)
  assign(@Req() request: Request, @Param('eventId') eventId: string, @Param('coordinatorId') coordinatorId: string) {
    return this.planning.assign(session(request), accountId(eventId), accountId(coordinatorId), true);
  }

  @Delete('events/:eventId/coordinators/:coordinatorId')
  @HttpCode(204)
  @Session('Revoke an event assignment as an administrator.', 204, true)
  revoke(@Req() request: Request, @Param('eventId') eventId: string, @Param('coordinatorId') coordinatorId: string) {
    return this.planning.assign(session(request), accountId(eventId), accountId(coordinatorId), false);
  }

  @Post('events/:eventId/locations')
  @Session('Add a location.', 201, true, staffLocation)
  @ApiBody({ schema: locationBody })
  addLocation(@Req() request: Request, @Param('eventId') eventId: string, @Body() body: unknown) {
    return this.planning.saveLocation(session(request), accountId(eventId), locationInput(body));
  }

  @Put('events/:eventId/locations/:locationId')
  @Session('Update a location.', 200, true, staffLocation)
  @ApiBody({ schema: locationBody })
  editLocation(
    @Req() request: Request, @Param('eventId') eventId: string, @Param('locationId') locationId: string, @Body() body: unknown,
  ) {
    return this.planning.saveLocation(session(request), accountId(eventId), locationInput(body), accountId(locationId));
  }

  @Post('events/:eventId/shifts')
  @Session('Add a shift.', 201, true, staffShift)
  @ApiBody({ schema: newShiftBody })
  addShift(@Req() request: Request, @Param('eventId') eventId: string, @Body() body: unknown) {
    return this.planning.saveShift(session(request), accountId(eventId), shiftInput(body, true));
  }

  @Patch('events/:eventId/shifts/:shiftId')
  @Session('Update a shift.', 200, true, staffShift)
  @ApiBody({ schema: shiftBody })
  editShift(@Req() request: Request, @Param('eventId') eventId: string, @Param('shiftId') shiftId: string, @Body() body: unknown) {
    return this.planning.saveShift(session(request), accountId(eventId), shiftInput(body), accountId(shiftId));
  }

  @Put('events/:eventId/shifts/:shiftId/positions/:roleId')
  @Session('Configure a role position and its capacity.', 200, true, position)
  @ApiBody({ schema: positionBody })
  position(
    @Req() request: Request, @Param('eventId') eventId: string, @Param('shiftId') shiftId: string,
    @Param('roleId') roleId: string, @Body() body: unknown,
  ) {
    return this.planning.savePosition(session(request), accountId(eventId), accountId(shiftId), roleId, positionInput(body));
  }

  @Put('events/:eventId/shifts/:shiftId/positions/:roleId/adequacy')
  @Session('Confirm or withdraw confirmation of tasks suitable for minors.', 200, true, position)
  @ApiBody({ schema: confirmationBody })
  adequacy(
    @Req() request: Request, @Param('eventId') eventId: string, @Param('shiftId') shiftId: string,
    @Param('roleId') roleId: string, @Body() body: unknown,
  ) {
    return this.planning.confirmPosition(
      session(request), accountId(eventId), accountId(shiftId), roleId, 'adequacy', booleanInput(body, 'confirmed'),
    );
  }

  @Put('events/:eventId/shifts/:shiftId/positions/:roleId/supervision')
  @Session('Confirm or withdraw supervision for minors.', 200, true, position)
  @ApiBody({ schema: confirmationBody })
  supervision(
    @Req() request: Request, @Param('eventId') eventId: string, @Param('shiftId') shiftId: string,
    @Param('roleId') roleId: string, @Body() body: unknown,
  ) {
    return this.planning.confirmPosition(
      session(request), accountId(eventId), accountId(shiftId), roleId, 'supervision', booleanInput(body, 'confirmed'),
    );
  }
}
