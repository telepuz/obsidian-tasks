/**
 * @jest-environment jsdom
 */
import moment from 'moment';
import { Occurrence } from '../../src/Task/Occurrence';
import { Recurrence } from '../../src/Task/Recurrence';
import { RecurrenceBuilder } from '../TestingTools/RecurrenceBuilder';

window.moment = moment;

describe('Recurrence', () => {
    it('creates a recurring instance even if no date is given', () => {
        // Arrange
        const recurrence = Recurrence.fromText({
            recurrenceRuleText: 'every week',
            occurrence: new Occurrence({}),
        });

        // Act
        const next = recurrence!.next();

        // Assert
        const nullOccurrence = new Occurrence({ startDate: null, scheduledDate: null, dueDate: null });
        expect(next).toStrictEqual(nullOccurrence);
    });

    it('creates a recurrence the next month, even on the 31st', () => {
        // Arrange
        const recurrence = Recurrence.fromText({
            recurrenceRuleText: 'every month',
            occurrence: new Occurrence({
                dueDate: moment('2022-01-31').startOf('day'),
            }),
        });

        // Act
        const next = recurrence!.next();

        // Assert
        expect(next!.startDate).toBeNull();
        expect(next!.scheduledDate).toBeNull();
        expect(next!.dueDate).toEqualMoment(moment('2022-02-28'));
    });

    it('creates a recurrence 3 months in', () => {
        // Arrange
        const recurrence = Recurrence.fromText({
            recurrenceRuleText: 'every 3 months',
            occurrence: new Occurrence({
                dueDate: moment('2022-01-31').startOf('day'),
            }),
        });

        // Act
        const next = recurrence!.next();

        // Assert
        expect(next!.startDate).toBeNull();
        expect(next!.scheduledDate).toBeNull();
        expect(next!.dueDate).toEqualMoment(moment('2022-04-30'));
    });

    it('creates a recurrence the next month, even across years', () => {
        // Arrange
        const recurrence = Recurrence.fromText({
            recurrenceRuleText: 'every 2 months',
            occurrence: new Occurrence({
                dueDate: moment('2023-12-31').startOf('day'),
            }),
        });

        // Act
        const next = recurrence!.next();

        // Assert
        expect(next!.startDate).toBeNull();
        expect(next!.scheduledDate).toBeNull();
        expect(next!.dueDate).toEqualMoment(moment('2024-02-29'));
    });

    it('creates a recurrence in 2 years, even on Feb 29th', () => {
        // Arrange
        const recurrence = Recurrence.fromText({
            recurrenceRuleText: 'every 2 years',
            occurrence: new Occurrence({
                dueDate: moment('2024-02-29').startOf('day'),
            }),
        });

        // Act
        const next = recurrence!.next();

        // Assert
        expect(next!.startDate).toBeNull();
        expect(next!.scheduledDate).toBeNull();
        expect(next!.dueDate).toEqualMoment(moment('2026-02-28'));
    });

    it('creates a recurrence in 11 months, even on March 31', () => {
        // Arrange
        const recurrence = Recurrence.fromText({
            recurrenceRuleText: 'every 11 months',
            occurrence: new Occurrence({
                dueDate: moment('2020-03-31').startOf('day'),
            }),
        });

        // Act
        const next = recurrence!.next();

        // Assert
        expect(next!.startDate).toBeNull();
        expect(next!.scheduledDate).toBeNull();
        expect(next!.dueDate).toEqualMoment(moment('2021-02-28'));
    });

    it('creates a recurrence in 13 months, even on Jan 31', () => {
        // Arrange
        const recurrence = Recurrence.fromText({
            recurrenceRuleText: 'every 13 months',
            occurrence: new Occurrence({
                dueDate: moment('2020-01-31').startOf('day'),
            }),
        });

        // Act
        const next = recurrence!.next();

        // Assert
        expect(next!.startDate).toBeNull();
        expect(next!.scheduledDate).toBeNull();
        expect(next!.dueDate).toEqualMoment(moment('2021-02-28'));
    });
});

// Test cases where a task has a non-existent due, scheduled or start date.
// Tests for invalid dates in the recurrence rules should go in a different section.
describe('Recurrence - with invalid dates in tasks', () => {
    it('does not create a recurrence if highest priority date is invalid', () => {
        // Arrange
        const recurrence = Recurrence.fromText({
            recurrenceRuleText: 'every day',
            occurrence: new Occurrence({
                dueDate: moment('2022-02-30').startOf('day'), // 30th February: invalid date
            }),
        });

        // Assert

        // Because the highest priority (reference) date in the task (due), was invalid,
        // it cannot construct the Recurrence instance.
        //
        // What this means in practice for users is that if they had an invalid
        // reference date on a recurring task, when the task is completed,
        // there will be no new instance, and the recurrence rule will be lost.
        expect(recurrence).toBeNull(); // Cannot calculated next date
    });

    it('creates a recurrence if a lower priority date is invalid', () => {
        // Arrange
        const recurrence = Recurrence.fromText({
            recurrenceRuleText: 'every day',
            occurrence: new Occurrence({
                scheduledDate: moment('2022-02-30').startOf('day'), // 30th February: invalid date
                dueDate: moment('2022-02-27').startOf('day'),
            }),
        });

        // Act
        const next = recurrence!.next();

        // Assert
        expect(next!.startDate).toBeNull();
        // The original scheduled date was an illegal/invalid date.
        // So it is simply given the new value of the same date as the reference date,
        // which here is the due date.
        expect(next!.scheduledDate).toEqualMoment(moment('2022-02-28')); // date was invalid, so is given the value of highest priority supplied date
        expect(next!.dueDate).toEqualMoment(moment('2022-02-28'));
    });
});

describe('identicalTo', () => {
    it('differing only in rule text', () => {
        const weekly = new RecurrenceBuilder().rule('every week').build();
        const daily = new RecurrenceBuilder().rule('every day').build();
        expect(weekly.identicalTo(daily)).toBe(false);
    });

    it('differing only in "when done"', () => {
        const weekly = new RecurrenceBuilder().rule('every week').build();
        const weeklyWhenDone = new RecurrenceBuilder().rule('every week when done').build();
        expect(weekly?.identicalTo(weeklyWhenDone)).toBe(false);
    });

    it('differing only in startDate', () => {
        // Two different dates
        const date1Recurrence = new RecurrenceBuilder().startDate('2021-10-21').build();

        const date2Recurrence = new RecurrenceBuilder().startDate('1998-03-13').build();

        const nullRecurrence = new RecurrenceBuilder().startDate(null).build();

        expect(date1Recurrence?.identicalTo(date1Recurrence)).toBe(true);
        expect(date1Recurrence?.identicalTo(date2Recurrence)).toBe(false);
        expect(date1Recurrence?.identicalTo(nullRecurrence)).toBe(false);
        expect(nullRecurrence?.identicalTo(date1Recurrence)).toBe(false);
    });

    it('differing only in scheduledDate', () => {
        // Two different dates
        // No need to replicate the null checks in startDate
        const date1Recurrence = new RecurrenceBuilder().scheduledDate('2021-10-21').build();

        const date2Recurrence = new RecurrenceBuilder().scheduledDate('1998-03-13').build();

        expect(date1Recurrence?.identicalTo(date1Recurrence)).toBe(true);
        expect(date1Recurrence?.identicalTo(date2Recurrence)).toBe(false);
    });

    it('differing only in dueDate', () => {
        // Two different dates
        // No need to replicate the null checks in startDate
        const date1Recurrence = new RecurrenceBuilder().dueDate('2021-10-21').build();

        const date2Recurrence = new RecurrenceBuilder().dueDate('1998-03-13').build();

        expect(date1Recurrence?.identicalTo(date1Recurrence)).toBe(true);
        expect(date1Recurrence?.identicalTo(date2Recurrence)).toBe(false);
    });
});

describe('Recurrence - with removeScheduledDateOnRecurrence', () => {
    it('should remove the scheduledDate when removeScheduledDate is true', () => {
        // Arrange
        const recurrence = Recurrence.fromText({
            recurrenceRuleText: 'every month',
            occurrence: new Occurrence({
                startDate: moment('2022-01-01').startOf('day'),
                scheduledDate: moment('2022-01-04').startOf('day'),
                dueDate: moment('2022-01-10').startOf('day'),
            }),
        });

        // Act
        const next = recurrence!.next(undefined, true);

        // Assert
        expect(next!.startDate).toEqualMoment(moment('2022-02-01'));
        expect(next!.scheduledDate).toBeNull();
        expect(next!.dueDate).toEqualMoment(moment('2022-02-10'));
    });

    it('should not remove the scheduledDate when it is the only date', () => {
        // Arrange
        const recurrence = Recurrence.fromText({
            recurrenceRuleText: 'every month',
            occurrence: new Occurrence({
                scheduledDate: moment('2022-01-04').startOf('day'),
            }),
        });

        // Act
        const next = recurrence!.next(undefined, true);

        // Assert
        expect(next!.scheduledDate).not.toBeNull();
    });
});
