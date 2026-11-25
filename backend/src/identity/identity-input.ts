import { BadRequestException, NotFoundException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { argon2id, hash } from 'argon2';

export const HOUR = 60 * 60_000;
export const MINUTE = 60_000;
export const ORGANIZATION = 'voluntrack';
export const PASSWORD_PATTERN = '^(?=[\\s\\S]*[A-Z])(?=[\\s\\S]*[0-9])[\\s\\S]+$';
const UUID = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;

export function input(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))) {
    throw new BadRequestException('Invalid request.');
  }
  return value as Record<string, unknown>;
}

export function emailAddress(value: unknown): string {
  if (typeof value !== 'string') throw new BadRequestException('Invalid email.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 ||
    !/^[a-z0-9.!#$%&'*+/=?^_{|}~-]{1,64}@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email)) {
    throw new BadRequestException('Invalid email.');
  }
  return email;
}

export function passwordInput(value: unknown): string {
  if (typeof value !== 'string' || value.length > 256 || !value.length) {
    throw new BadRequestException('Invalid password.');
  }
  return value;
}

export async function hashPassword(value: unknown): Promise<string> {
  const password = passwordInput(value);
  const length = [...password].length;
  if (length < 10 || length > 128 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new BadRequestException('Password does not meet the policy.');
  }
  return hash(password, { type: argon2id });
}

export function localeInput(value: unknown): 'ro' | 'en' {
  if (value === undefined || value === 'ro') return 'ro';
  if (value === 'en') return 'en';
  throw new BadRequestException('Invalid locale.');
}

export function uuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function accountId(value: string): string {
  if (!uuid(value)) throw new NotFoundException();
  return value;
}

export function equalToken(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function profileInput(body: unknown): {
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: Date | null;
  phone?: string | null;
  locality?: string | null;
} {
  const values = input(body, ['firstName', 'lastName', 'birthDate', 'phone', 'locality']);
  const result: ReturnType<typeof profileInput> = {};
  for (const key of ['firstName', 'lastName', 'phone', 'locality'] as const) {
    const value = values[key];
    if (value === undefined) continue;
    if (value === null) {
      result[key] = null;
    } else if (typeof value !== 'string' || value.length > (key === 'phone' ? 32 : 120)) {
      throw new BadRequestException('Invalid profile field.');
    } else {
      result[key] = value.trim() || null;
    }
  }
  const date = values.birthDate;
  if (date === null) {
    result.birthDate = null;
  } else if (date !== undefined) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Invalid birth date.');
    }
    const parsed = new Date(date + 'T00:00:00Z');
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || parsed > new Date()) {
      throw new BadRequestException('Invalid birth date.');
    }
    result.birthDate = parsed;
  }
  return result;
}
