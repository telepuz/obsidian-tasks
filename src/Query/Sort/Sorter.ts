import type { Task } from '../../Task/Task';
import type { SearchInfo } from '../SearchInfo';
import { Statement } from '../Statement';

/**
 * A sorting function, that takes two Task objects and returns
 * and returns one of:
 * - `-1` or some other negative number, if a is less than b by some ordering criterion.
 * - `+1` or some other positive number, if a is greater than b by the ordering criterion.
 * - `0` or sometimes `-0`, if a equals b by the ordering criterion.
 *
 * Typically Comparator functions are stored in a {@link Sorter} object.
 *
 * The {@link SearchInfo} parameter allows implementations to inspect selected information
 * about the {@link Query} containing the search being run.
 */
export type Comparator = (a: Task, b: Task, searchInfo: SearchInfo) => number;

/**
 * Sorter represents a single 'sort by' instruction.
 * It stores the comparison function as a {@link Comparator}.
 */
export class Sorter {
    /** _statement may be updated later with {@link setStatement} */
    private _statement: Statement;
    public readonly property: string;
    public readonly comparator: Comparator;

    /**
     * Constructor.
     *
     * @param instruction - the query instruction that created this object
     * @param property - the name of the property.
     * @param comparator - {@link Comparator} function, for sorting in the standard direction.
     *                     If `reverse` is true, it will automatically be converted to reverse the sort direction.
     * @param reverse - whether the sort order should be reversed.
     */
    constructor(instruction: string, property: string, comparator: Comparator, reverse: boolean) {
        this._statement = new Statement(instruction, instruction);
        this.property = property;
        this.comparator = Sorter.maybeReverse(reverse, comparator);
    }

    /**
     * Optionally record more detail about the source statement.
     *
     * In tests, we only care about the actual instruction being parsed and executed.
     * However, in {@link Query}, we want the ability to show user more information.
     */
    public setStatement(statement: Statement) {
        this._statement = statement;
    }

    public get statement(): Statement {
        return this._statement;
    }

    public get instruction(): string {
        return this._statement.anyPlaceholdersExpanded;
    }

    private static maybeReverse(reverse: boolean, comparator: Comparator) {
        return reverse ? Sorter.makeReversedComparator(comparator) : comparator;
    }

    private static makeReversedComparator(comparator: Comparator): Comparator {
        // Note: This can return -0.
        return (a, b, searchInfo) => (comparator(a, b, searchInfo) * -1) as -1 | 0 | 1;
    }
}
