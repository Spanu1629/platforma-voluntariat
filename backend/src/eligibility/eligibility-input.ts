import { BadRequestException } from '@nestjs/common';
import { input } from '../identity/identity-input';
import { parseCalendarDate, type AvailabilityInterval } from './eligibility-rules';

export type Availability = {
  weekly: { weekday: number; intervals: AvailabilityInterval[] }[];
  exceptions: { date: string; intervals: AvailabilityInterval[] }[];
};

function minute(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 1440) {
    throw new BadRequestException('Invalid minute of day.');
  }
  return value;
}

function intervals(value: unknown): AvailabilityInterval[] {
  if (!Array.isArray(value) || value.length > 1440) throw new BadRequestException('Invalid availability intervals.');
  const rows = value.map((item) => {
    const row = input(item, ['startMinute', 'endMinute']);
    return { startMinute: minute(row.startMinute), endMinute: minute(row.endMinute) };
  }).sort((a, b) => a.startMinute - b.startMinute);
  let previousEnd = 0;
  for (const row of rows) {
    if (row.startMinute >= row.endMinute || row.startMinute < previousEnd) {
      throw new BadRequestException('Availability intervals must be ordered and nonoverlapping.');
    }
    previousEnd = row.endMinute;
  }
  return rows;
}

export function availabilityInput(value: unknown): Availability {
  const { weekly, exceptions } = input(value, ['weekly', 'exceptions']);
  if (!Array.isArray(weekly) || !Array.isArray(exceptions)) {
    throw new BadRequestException('Both weekly availability and exceptions are required.');
  }
  const weekdays = new Set<number>();
  const days = weekly.flatMap((item) => {
    const row = input(item, ['weekday', 'intervals']);
    const weekday = row.weekday;
    if (typeof weekday !== 'number' || !Number.isInteger(weekday) || weekday < 1 || weekday > 7 || weekdays.has(weekday)) {
      throw new BadRequestException('Invalid or duplicate weekday.');
    }
    weekdays.add(weekday);
    const ranges = intervals(row.intervals);
    return ranges.length ? [{ weekday, intervals: ranges }] : [];
  }).sort((a, b) => a.weekday - b.weekday);
  const dates = new Set<string>();
  const overrides = exceptions.map((item) => {
    const row = input(item, ['date', 'intervals']);
    const date = row.date;
    if (typeof date !== 'string' || !parseCalendarDate(date) || dates.has(date)) {
      throw new BadRequestException('Invalid or duplicate exception date.');
    }
    dates.add(date);
    return { date, intervals: intervals(row.intervals) };
  }).sort((a, b) => a.date.localeCompare(b.date));
  return { weekly: days, exceptions: overrides };
}
