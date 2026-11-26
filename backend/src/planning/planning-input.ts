import { BadRequestException } from '@nestjs/common';
import { input, uuid } from '../identity/identity-input';
import { parseInstant, type Span } from '../eligibility/eligibility-rules';

export function text(value: unknown, limit: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new BadRequestException('Invalid text.');
  return value.trim();
}

function optionalText(value: unknown, limit: number): string | null | undefined {
  return value === null || value === undefined ? value : text(value, limit);
}

export function eventInput(body: unknown) {
  const values = input(body, ['title', 'description']);
  return { title: optionalText(values.title, 200), description: optionalText(values.description, 12_000) };
}

export function locationInput(body: unknown) {
  const values = input(body, ['name', 'address']);
  return { name: text(values.name, 200), address: optionalText(values.address, 400) };
}

function instant(value: unknown): Date {
  const date = parseInstant(value);
  if (!date) throw new BadRequestException('Use a valid UTC timestamp or an offset in Europe/Bucharest.');
  return date;
}

function optionalInstant(value: unknown) {
  return value === null || value === undefined ? value : instant(value);
}

function spans(value: unknown): Span[] | undefined {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 1440) throw new BadRequestException('Invalid planned breaks.');
  return value.map((item) => {
    const values = input(item, ['startsAt', 'endsAt']);
    const startsAt = instant(values.startsAt);
    const endsAt = instant(values.endsAt);
    if (startsAt >= endsAt) throw new BadRequestException('Invalid break interval.');
    return { startsAt, endsAt };
  });
}

function shiftPositions(value: unknown) {
  if (value === undefined) return;
  if (!Array.isArray(value)) throw new BadRequestException('Invalid shift positions.');
  const roleIds = new Set<string>();
  return value.map((item) => {
    const values = input(item, ['roleId', 'capacity', 'tasks']);
    const roleId = text(values.roleId, 120);
    if (roleIds.has(roleId)) throw new BadRequestException('Duplicate role in the shift.');
    roleIds.add(roleId);
    const { capacity, tasks } = positionInput({ capacity: values.capacity, tasks: values.tasks });
    if (capacity === undefined) throw new BadRequestException('Capacity is required.');
    return { roleId, capacity, tasks };
  });
}

export function shiftInput(body: unknown, allowPositions = false) {
  const keys = ['locationId', 'startsAt', 'endsAt', 'breaks'];
  if (allowPositions) keys.push('positions');
  const values = input(body, keys);
  const locationId = values.locationId;
  if (locationId !== null && locationId !== undefined && !uuid(locationId)) {
    throw new BadRequestException('Invalid location.');
  }
  return {
    locationId, startsAt: optionalInstant(values.startsAt), endsAt: optionalInstant(values.endsAt),
    breaks: spans(values.breaks), positions: shiftPositions(values.positions),
  };
}

export function positionInput(body: unknown) {
  const values = input(body, ['capacity', 'tasks']);
  const capacity = values.capacity;
  if (capacity !== undefined && (typeof capacity !== 'number' || !Number.isInteger(capacity) ||
    capacity < 0 || capacity > 2_147_483_647)) throw new BadRequestException('Invalid capacity.');
  return { capacity, tasks: optionalText(values.tasks, 4_000) };
}

export function booleanInput(body: unknown, key: string): boolean {
  const { [key]: value } = input(body, [key]);
  if (typeof value !== 'boolean') throw new BadRequestException('A boolean value is required.');
  return value;
}
