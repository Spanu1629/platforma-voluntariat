import {
  applyDecorators, BadRequestException, Body, Controller, Delete, Get, HttpCode,
  Param, Patch, Post, Put, Req, Res, UseFilters, UseGuards,
} from '@nestjs/common';
import {
  ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiSecurity, ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { accountId, emailAddress, input, localeInput, passwordInput, PASSWORD_PATTERN, profileInput } from './identity-input';
import { cookie, cookieOptions, IdentityCsrf, IdentityExceptionFilter, SESSION_COOKIE } from './identity-http';
import { IdentityService } from './identity.service';

const email = { type: 'string', format: 'email', maxLength: 254 } as const;
const password = { type: 'string', format: 'password', minLength: 10, maxLength: 128, pattern: PASSWORD_PATTERN } as const;
const locale = { type: 'string' as const, enum: ['ro', 'en'] };
const token = { type: 'string', minLength: 80, maxLength: 80 } as const;
const staffRole = { type: 'string' as const, enum: ['ADMIN', 'COORDINATOR'] };
const idField = { type: 'string', format: 'uuid' } as const;
const identitySchema = {
  type: 'object' as const,
  properties: {
    id: idField, email, role: { type: 'string' as const, enum: ['VOLUNTEER', ...staffRole.enum] },
    approved: { type: 'boolean' as const },
  },
  required: ['id', 'email', 'role', 'approved'],
};
const editableProfile = {
  firstName: { type: 'string', nullable: true, maxLength: 120 },
  lastName: { type: 'string', nullable: true, maxLength: 120 },
  birthDate: { type: 'string', nullable: true, format: 'date' },
  phone: { type: 'string', nullable: true, maxLength: 32 },
  locality: { type: 'string', nullable: true, maxLength: 120 },
} as const;
const profileSchema = {
  ...identitySchema,
  properties: { ...identitySchema.properties, ...editableProfile },
  required: [...identitySchema.required, ...Object.keys(editableProfile)],
};
const stateDate = { type: 'string', format: 'date-time', nullable: true } as const;
const staffSchema = {
  type: 'object' as const,
  properties: { id: idField, email, role: staffRole, emailVerifiedAt: stateDate,
    activatedAt: stateDate, disabledAt: stateDate, canApprove: { type: 'boolean' as const } },
  required: ['id', 'email', 'role', 'emailVerifiedAt', 'activatedAt', 'disabledAt', 'canApprove'],
};

function Write(summary: string, status: number, authenticated = false) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiHeader({ name: 'X-CSRF-Token', required: true, description: 'Token returned by GET /identity/csrf.' }),
    ApiResponse({ status }),
    ApiResponse({ status: 400, description: 'Invalid input or expired, invalid, or consumed link.' }),
    ApiResponse({ status: 403, description: 'Invalid CSRF proof or insufficient privileges.' }),
    ...(authenticated ? [ApiSecurity('session'), ApiResponse({ status: 401, description: 'Invalid or expired session.' })] : []),
  );
}

function ReadSession(summary: string) {
  return applyDecorators(
    ApiOperation({ summary }), ApiSecurity('session'), ApiResponse({ status: 200 }),
    ApiResponse({ status: 401, description: 'Invalid or expired session.' }),
    ApiResponse({ status: 403, description: 'Insufficient privileges.' }),
  );
}

@ApiTags('Identity')
@UseGuards(IdentityCsrf)
@UseFilters(IdentityExceptionFilter)
@Controller('identity')
export class IdentityController {
  constructor(private readonly identity: IdentityService, private readonly csrf: IdentityCsrf) {}

  @Get('csrf')
  @ApiOperation({ summary: 'Issue a CSRF token and its host-only cookie.' })
  @ApiResponse({ status: 200, schema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } } })
  csrfToken(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.csrf.issue(request, response);
  }

  @Post('register')
  @HttpCode(202)
  @Write('Register a volunteer and request email verification.', 202)
  @ApiBody({ schema: { type: 'object', required: ['email'], additionalProperties: false,
    properties: { email, locale } } })
  async register(@Body() body: unknown): Promise<void> {
    const values = input(body, ['email', 'locale']);
    await this.identity.register(values.email, localeInput(values.locale));
  }

  @Post('email/request')
  @HttpCode(202)
  @Write('Request a verification or staff activation email.', 202)
  @ApiBody({ schema: { type: 'object', required: ['email'], additionalProperties: false, properties: { email } } })
  requestVerification(@Body() body: unknown) {
    return this.identity.requestLink(emailAddress(input(body, ['email']).email), 'VERIFY_EMAIL');
  }

  @Get(['email/verify', 'password/reset', 'staff/activate'])
  @ApiOperation({ summary: 'Open an email link without consuming it. Confirm using POST.' })
  @ApiResponse({ status: 200 })
  openLink() {
    return { method: 'POST', csrf: '/identity/csrf' };
  }

  @Post('email/verify')
  @HttpCode(204)
  @Write('Confirm a volunteer email address and set its initial password with a single-use link.', 204)
  @ApiBody({ schema: { type: 'object', required: ['token', 'password'], additionalProperties: false,
    properties: { token, password } } })
  verifyEmail(@Body() body: unknown) {
    const values = input(body, ['token', 'password']);
    return this.identity.consumeLink('VERIFY_EMAIL', values.token, values.password);
  }

  @Post('password/request')
  @HttpCode(202)
  @Write('Request password recovery. The response does not disclose whether the account exists.', 202)
  @ApiBody({ schema: { type: 'object', required: ['email'], additionalProperties: false, properties: { email } } })
  requestReset(@Body() body: unknown) {
    return this.identity.requestLink(emailAddress(input(body, ['email']).email), 'RESET_PASSWORD');
  }

  @Post('password/reset')
  @HttpCode(204)
  @Write('Set a new password and revoke all sessions.', 204)
  @ApiBody({ schema: { type: 'object', required: ['token', 'password'], additionalProperties: false,
    properties: { token, password } } })
  reset(@Body() body: unknown) {
    const values = input(body, ['token', 'password']);
    return this.identity.consumeLink('RESET_PASSWORD', values.token, values.password);
  }

  @Post('login')
  @HttpCode(200)
  @ApiResponse({ status: 200, schema: identitySchema, headers: {
    'Set-Cookie': { description: 'Host-only Secure, HttpOnly session cookie.', schema: { type: 'string' } },
  } })
  @Write('Authenticate and issue a session cookie.', 200)
  @ApiResponse({ status: 401, description: 'Invalid credentials or account not eligible to sign in.' })
  @ApiResponse({ status: 429, description: 'Too many authentication attempts.' })
  @ApiBody({ schema: { type: 'object', required: ['email', 'password'], additionalProperties: false,
    properties: { email, password: { type: 'string', format: 'password' } } } })
  async login(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const values = input(body, ['email', 'password']);
    const login = await this.identity.login(emailAddress(values.email), passwordInput(values.password),
      request.ip ?? request.socket.remoteAddress ?? 'unknown');
    response.cookie(SESSION_COOKIE, login.token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60_000 });
    return login.account;
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Revoke the current session if present and clear its cookie.',
    description: 'Requires the configured HTTPS origin and matching host-only CSRF cookie, including for repeated requests.',
  })
  @ApiSecurity('session')
  @ApiSecurity({})
  @ApiHeader({ name: 'X-CSRF-Token', required: true, description: 'Token returned by GET /identity/csrf.' })
  @ApiResponse({ status: 204, headers: {
    'Set-Cookie': { description: 'Expires the host-only session cookie.', schema: { type: 'string' } },
  } })
  @ApiResponse({ status: 403, description: 'Invalid request origin or CSRF token.' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.identity.logout(cookie(request, SESSION_COOKIE));
    response.clearCookie(SESSION_COOKIE, cookieOptions);
  }

  @Get('profile')
  @ApiResponse({ status: 200, schema: profileSchema })
  @ReadSession('Read the authenticated account’s own profile.')
  profile(@Req() request: Request) {
    return this.identity.profile(cookie(request, SESSION_COOKIE));
  }

  @Patch('profile')
  @ApiResponse({ status: 200, schema: profileSchema })
  @Write('Edit the authenticated volunteer’s own profile.', 200, true)
  @ApiBody({ schema: { type: 'object', additionalProperties: false, properties: editableProfile } })
  updateProfile(@Req() request: Request, @Body() body: unknown) {
    return this.identity.profile(cookie(request, SESSION_COOKIE), profileInput(body));
  }

  @Get('accounts/pending')
  @ApiResponse({ status: 200, schema: { type: 'array', items: {
    type: 'object', properties: { id: idField, email }, required: ['id', 'email'],
  } } })
  @ReadSession('List up to 100 verified volunteers pending approval in the authorized organization.')
  pending(@Req() request: Request) {
    return this.identity.pendingAccounts(cookie(request, SESSION_COOKIE));
  }

  @Post('accounts/:id/approve')
  @HttpCode(204)
  @Write('Approve a verified volunteer account in the authorized organization.', 204, true)
  @ApiResponse({ status: 404, description: 'No authorized volunteer target.' })
  @ApiResponse({ status: 409, description: 'The target account is not eligible for approval.' })
  approve(@Req() request: Request, @Param('id') id: string) {
    return this.identity.approve(cookie(request, SESSION_COOKIE), accountId(id));
  }

  @Get('staff')
  @ApiResponse({ status: 200, schema: { type: 'array', items: staffSchema } })
  @ReadSession('List staff accounts in the administrator’s organization.')
  listStaff(@Req() request: Request) {
    return this.identity.listStaff(cookie(request, SESSION_COOKIE));
  }

  @Post('staff')
  @ApiResponse({ status: 201, schema: staffSchema })
  @Write('Create a coordinator or administrator and queue an activation email.', 201, true)
  @ApiResponse({ status: 409, description: 'Email address already in use.' })
  @ApiBody({ schema: { type: 'object', required: ['email', 'role'], additionalProperties: false,
    properties: { email, role: staffRole, locale } } })
  createStaff(@Req() request: Request, @Body() body: unknown) {
    const values = input(body, ['email', 'role', 'locale']);
    if (values.role !== 'ADMIN' && values.role !== 'COORDINATOR') throw new BadRequestException('Invalid role.');
    return this.identity.createStaff(cookie(request, SESSION_COOKIE), emailAddress(values.email), values.role, localeInput(values.locale));
  }

  @Post('staff/activate')
  @HttpCode(204)
  @Write('Activate a staff account and set its password using a single-use link.', 204)
  @ApiBody({ schema: { type: 'object', required: ['token', 'password'], additionalProperties: false,
    properties: { token, password } } })
  activateStaff(@Body() body: unknown) {
    const values = input(body, ['token', 'password']);
    return this.identity.consumeLink('ACTIVATE_STAFF', values.token, values.password);
  }

  @Patch('staff/:id')
  @HttpCode(204)
  @Write('Change a staff role or active status, preserving at least one active administrator.', 204, true)
  @ApiResponse({ status: 404, description: 'No authorized staff target.' })
  @ApiResponse({ status: 409, description: 'The last active administrator must remain.' })
  @ApiBody({ schema: { oneOf: [
    { type: 'object', additionalProperties: false, required: ['role'], properties: { role: staffRole } },
    { type: 'object', additionalProperties: false, required: ['disabled'], properties: { disabled: { type: 'boolean' } } },
  ] } })
  changeStaff(@Req() request: Request, @Param('id') id: string, @Body() body: unknown) {
    const values = input(body, ['role', 'disabled']);
    const session = cookie(request, SESSION_COOKIE);
    const target = accountId(id);
    if (Object.keys(values).length === 1) {
      if (values.role === 'ADMIN' || values.role === 'COORDINATOR') return this.identity.changeStaff(session, target, { role: values.role });
      if (typeof values.disabled === 'boolean') return this.identity.changeStaff(session, target, { disabled: values.disabled });
    }
    throw new BadRequestException('Provide one staff change.');
  }

  @Put('delegations/:id')
  @HttpCode(204)
  @Write('Grant approval authority to a coordinator in the administrator’s organization.', 204, true)
  @ApiResponse({ status: 404, description: 'No authorized coordinator target.' })
  grant(@Req() request: Request, @Param('id') id: string) {
    return this.identity.setDelegation(cookie(request, SESSION_COOKIE), accountId(id), true);
  }

  @Delete('delegations/:id')
  @HttpCode(204)
  @Write('Revoke a coordinator’s approval authority.', 204, true)
  @ApiResponse({ status: 404, description: 'No authorized coordinator target.' })
  revoke(@Req() request: Request, @Param('id') id: string) {
    return this.identity.setDelegation(cookie(request, SESSION_COOKIE), accountId(id), false);
  }
}
