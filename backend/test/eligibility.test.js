const iso = (value) => new Date(value);
const at = (time) => iso(`2027-02-14T${time}:00+02:00`);
const span = (start, end) => ({ startsAt: at(start), endsAt: at(end) });
const defaultPolicy = { breakThresholdMinutes: 240, minimumBreakMinutes: 30 };
const rules = () => require('../dist/eligibility/eligibility-rules');

test('UTC timestamps honor the local day boundary and distinguish DST folds', () => {
  const { parseInstant, shiftTiming } = rules();
  expect(parseInstant('2027-03-28T03:30:00+02:00')).toBeNull();
  expect(parseInstant('2027-10-31T03:30:00+03:00').toISOString()).toBe('2027-10-31T00:30:00.000Z');
  expect(parseInstant('2027-10-31T03:30:00+02:00').toISOString()).toBe('2027-10-31T01:30:00.000Z');
  expect(shiftTiming({ startsAt: at('23:00'), endsAt: iso('2027-02-15T00:00:00+02:00'), breaks: [] }, defaultPolicy).valid)
    .toBe(true);
  expect(shiftTiming({ startsAt: at('23:00'), endsAt: iso('2027-02-15T00:01:00+02:00'), breaks: [] }, defaultPolicy).valid)
    .toBe(false);
});

test('the minimum is continuous and every nonoverlapping break is subtracted', () => {
  const { shiftTiming } = rules();
  expect(shiftTiming({ ...span('10:00', '14:00'), breaks: [span('11:00', '11:15'), span('12:00', '12:15')] }, defaultPolicy).valid)
    .toBe(false);
  expect(shiftTiming({ ...span('10:00', '15:00'), breaks: [span('12:00', '12:30')] }, defaultPolicy))
    .toMatchObject({ valid: true, effectiveMinutes: 270 });
  expect(shiftTiming({ ...span('10:00', '15:00'), breaks: [span('12:00', '12:30'), span('13:00', '13:15')] }, defaultPolicy))
    .toMatchObject({ valid: true, effectiveMinutes: 255 });
  expect(shiftTiming({ ...span('10:00', '14:00'), breaks: [span('11:00', '11:20'), span('11:20', '11:40')] }, defaultPolicy).valid)
    .toBe(false);
  expect(shiftTiming({ ...span('10:00', '14:00'), breaks: [span('11:00', '11:30'), span('11:20', '11:40')] }, defaultPolicy).valid)
    .toBe(false);
  expect(shiftTiming({ ...span('10:00', '13:59'), breaks: [] }, defaultPolicy).valid).toBe(true);
});

test('date exceptions replace weekly intervals and adjacent periods give full coverage', () => {
  const { coversShift } = rules();
  const shift = span('10:00', '12:00');
  const weekly = [{ startMinute: 600, endMinute: 660 }, { startMinute: 660, endMinute: 720 }];
  expect(coversShift(shift, weekly)).toBe(true);
  expect(coversShift(shift, [{ startMinute: 600, endMinute: 659 }, weekly[1]])).toBe(false);
  expect(coversShift(shift, weekly, [weekly[0]])).toBe(false);
  expect(coversShift(shift, weekly, [])).toBe(false);
});

test.each([
  ['2011-02-13', 16], ['2011-02-14', 16], ['2011-02-15', 15],
  ['2012-02-15', 14], ['2009-02-14', 18],
])('age on the local day of the shift uses the calendar birthday for %s', (birthday, expected) => {
  expect(rules().ageAtShift(iso(birthday + 'T00:00:00Z'), at('00:30'))).toBe(expected);
});

test('schedule enforces overlap, thirty-minute separation and the effective cap across events', () => {
  const { scheduleIssues } = rules();
  const current = { ...span('10:00', '12:00'), effectiveMinutes: 120 };
  const preceding = (end, effectiveMinutes) => ({ ...span('08:00', end), effectiveMinutes });
  expect(scheduleIssues(current, [preceding('09:30', 120)], false)).toEqual([]);
  expect(scheduleIssues(current, [preceding('09:31', 120)], false)).toContain('SHIFT_GAP');
  expect(scheduleIssues(current, [preceding('10:01', 121)], false)).toContain('SHIFT_OVERLAP');
  expect(scheduleIssues(current, [preceding('09:30', 121)], false)).toContain('DAILY_LIMIT');
  expect(scheduleIssues({ ...current, effectiveMinutes: 360 }, [preceding('09:30', 120)], true)).toEqual([]);
  expect(scheduleIssues({ ...current, effectiveMinutes: 361 }, [preceding('09:30', 120)], true)).toContain('DAILY_LIMIT');
});
