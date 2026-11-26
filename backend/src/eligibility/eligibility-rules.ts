export const PLANNING_ZONE = 'Europe/Bucharest';
const MINUTE = 60_000;
const MINIMUM_AGE = 15;
const ADULT_AGE = 18;
const SHIFT_GAP_MINUTES = 30;
const DAILY_MINUTES = { minor: 240, adult: 480 };

const localClock = new Intl.DateTimeFormat('sv-SE', {
  timeZone: PLANNING_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

export type Span = { startsAt: Date; endsAt: Date };
export type TimedShift = Span & { breaks: Span[] };
export type BreakPolicy = { breakThresholdMinutes: number; minimumBreakMinutes: number };
export type AvailabilityInterval = { startMinute: number; endMinute: number };
export type ScheduledShift = Span & { effectiveMinutes: number };

function localStamp(date: Date | number): string {
  return localClock.format(date).replace(' ', 'T');
}

export function localDate(date: Date | number): string {
  return localStamp(date).slice(0, 10);
}

export function parseCalendarDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function parseInstant(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || !parseCalendarDate(value.slice(0, 10))) return null;
  const date = new Date(value);
  if (!Number.isFinite(+date)) return null;
  const wallTime = match[1] + ':' + (match[2] ?? '00');
  if (match[3] === 'Z') return date.toISOString().slice(0, 19) === wallTime ? date : null;
  return localStamp(date) === wallTime ? date : null;
}

export function ageAtShift(birthday: Date, startsAt: Date): number {
  const born = birthday.toISOString().slice(0, 10);
  const day = localDate(startsAt);
  return Number(day.slice(0, 4)) - Number(born.slice(0, 4)) - Number(day.slice(5) < born.slice(5));
}

function insideLocalDay(shift: Span): boolean {
  const startDay = localDate(shift.startsAt);
  if (localDate(shift.endsAt) === startDay) return true;
  const followingDay = new Date(new Date(startDay + 'T00:00:00Z').getTime() + 86_400_000).toISOString().slice(0, 10);
  return localStamp(shift.endsAt) === followingDay + 'T00:00:00' && shift.endsAt.getUTCMilliseconds() === 0;
}

export function shiftTiming(shift: TimedShift, policy: BreakPolicy): { valid: false } | { valid: true; effectiveMinutes: number } {
  const duration = (+shift.endsAt - +shift.startsAt) / MINUTE;
  if (duration <= 0 || !insideLocalDay(shift)) return { valid: false };

  const breaks = [...shift.breaks].sort((a, b) => +a.startsAt - +b.startsAt);
  let lastEnd = shift.startsAt;
  let total = 0;
  let longest = 0;
  for (const pause of breaks) {
    const minutes = (+pause.endsAt - +pause.startsAt) / MINUTE;
    if (minutes <= 0 || pause.startsAt < lastEnd || pause.endsAt > shift.endsAt) return { valid: false };
    total += minutes;
    longest = Math.max(longest, minutes);
    lastEnd = pause.endsAt;
  }
  if (duration >= policy.breakThresholdMinutes && longest < policy.minimumBreakMinutes) return { valid: false };
  return { valid: true, effectiveMinutes: duration - total };
}

export function coversShift(
  shift: Span, weekly: AvailabilityInterval[], exception?: AvailabilityInterval[],
): boolean {
  const intervals = exception ?? weekly;
  // Walk real minutes so spring's missing local hour and autumn's repeated local hour map correctly.
  for (let time = +shift.startsAt; time < +shift.endsAt; time = (Math.floor(time / MINUTE) + 1) * MINUTE) {
    const stamp = localStamp(time);
    const minute = Number(stamp.slice(11, 13)) * 60 + Number(stamp.slice(14, 16));
    if (!intervals.some((interval) => interval.startMinute <= minute && minute < interval.endMinute)) return false;
  }
  return true;
}

export function scheduleIssues(shift: ScheduledShift, occupied: ScheduledShift[], adult: boolean): string[] {
  const issues = new Set<string>();
  const day = localDate(shift.startsAt);
  let total = shift.effectiveMinutes;
  for (const other of occupied) {
    if (other.startsAt < shift.endsAt && shift.startsAt < other.endsAt) issues.add('SHIFT_OVERLAP');
    else {
      const gap = Math.max(+shift.startsAt - +other.endsAt, +other.startsAt - +shift.endsAt);
      if (gap < SHIFT_GAP_MINUTES * MINUTE) issues.add('SHIFT_GAP');
    }
    if (localDate(other.startsAt) === day) total += other.effectiveMinutes;
  }
  if (total > (adult ? DAILY_MINUTES.adult : DAILY_MINUTES.minor)) issues.add('DAILY_LIMIT');
  return [...issues];
}

export function ageIssues(age: number, role: {
  minimumAge: number; supervisionForMinors: boolean; adequate: boolean; supervised: boolean;
}): string[] {
  if (age < Math.max(MINIMUM_AGE, role.minimumAge)) return ['AGE_BELOW_MINIMUM'];
  if (age >= ADULT_AGE) return [];
  const issues: string[] = [];
  if (!role.adequate) issues.push('POSITION_NOT_CONFIRMED_FOR_MINORS');
  if (role.supervisionForMinors && !role.supervised) issues.push('SUPERVISION_NOT_CONFIRMED');
  return issues;
}
