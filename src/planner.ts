import type { Result } from "./result";

/**
 * A study session that is either pending or done.
 *
 * INVARIANTS:
 * - plannedMinutes: a whole number in [1, 120]
 * - actualMinutes (done sessions only): a whole number in [1, 120]
 *
 * Pending sessions carry kind, title, and plannedMinutes.
 * Done sessions also carry actualMinutes.
 */
//
// TODO: In TASK 1, replace unknown with a tagged union.
//       Give each case its own literal kind; do not use optional fields.
//
export type Session =  { kind: "pending"; title: string; plannedMinutes: number }| { kind: "done"; title: string; plannedMinutes: number; actualMinutes: number };

/**
 * A planner whose representation is protected inside a closure.
 *
 * Operations:
 * - add: append a session if its title is unique and capacity permits
 * - finish: mark a pending session as done
 * - getSessions: report the current sessions without exposing private state
 *
 * INVARIANTS:
 * - capacity is a positive whole number
 * - the number of stored sessions never exceeds capacity
 * - stored titles are unique (exact, case-sensitive equality)
 * - all stored sessions satisfy the Session invariants
 */
export type Planner = {
    /**
     * Adds a copy of a session to this planner.
     *
     * Preconditions:
     * - session satisfies the Session invariants.
     *
     * Postconditions:
     * - On success, a copy is appended and the Planner invariants still hold.
     * - On failure, the planner is unchanged.
     * - Later changes to session cannot affect this planner.
     *
     * @param session The pending or done session to add.
     * @returns Success with undefined, or "duplicate title" before "full".
     * Modifies: this planner's private state on success.
     */
    add(session: Session): Result<void, string>;

    /**
     * Finishes a pending session, preserving its title and position.
     *
     * Preconditions:
     * - actualMinutes is finite.
     *
     * Postconditions:
     * - On success, the matching session is done with the given actualMinutes.
     * - Its plannedMinutes and position are unchanged; it still occupies a slot.
     * - On failure, all planner state is unchanged.
     *
     * @param title The exact title of the session to finish.
     * @param actualMinutes The time actually spent studying.
     * @returns Success with undefined, or the first applicable error:
     *          "not found", "already done", "invalid minutes" (in this order).
     * Modifies: this planner's private state on success.
     */
    finish(title: string, actualMinutes: number): Result<void, string>;

    /**
     * Reports the sessions in insertion order.
     *
     * Postconditions:
     * - Returns a fresh array containing fresh session objects.
     * - Changing the array or its objects cannot change the planner.
     *
     * @returns A snapshot of the current sessions. The planner is unchanged.
     */
    getSessions(): Session[];
};

/**
 * Creates a pending session with the given title and planned duration.
 *
 * Precondition: minutes is finite.
 *
 * Postconditions:
 * - Any returned Session satisfies the Session invariants.
 * - The title is preserved exactly, including an empty title or whitespace.
 *
 * @param title The title of the session.
 * @param minutes The planned time, a whole number in [1, 120].
 * @returns A fresh pending Session in a successful Result, or
 *          an error ("invalid minutes") if minutes is outside the valid range
 *          or is not a whole number.
 */
export function makeSession(title: string, minutes: number): Result<Session, string> {
    if (!Number.isFinite(minutes) || !Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
        return { ok: false, error: "invalid minutes" };
    }
    return { ok: true, value: { kind: "pending", title, plannedMinutes: minutes } };
}

// ---------------------------------------------------------------------------
// Toolbox: choose the array operation whose SHAPE fits the computation.
//
//   sessions.map(s => ...)                 -> one result per element, in order
//   sessions.filter(s => ...)              -> only matching elements, in order
//   sessions.reduce((acc, s) => ..., start) -> one combined value
//   sessions.find(s => ...)                -> first match, or undefined
//
// A new array may still contain references to the original objects.
// Think about what the caller can change before trusting a snapshot.
// ---------------------------------------------------------------------------

/**
 * The total time actually spent on completed sessions.
 *
 * Precondition: all sessions satisfy the Session invariants.
 *
 * @param sessions A sequence of pending and done study sessions.
 * @returns The sum of actualMinutes for done sessions; 0 if there are none.
 *          Pending sessions are ignored. The array and objects are unchanged.
 */
export function completedMinutes(sessions: Session[]): number {
    let sum = 0;
    for (const session of sessions) {
        if (session.kind === "done") {
            sum += session.actualMinutes;
        }
    }
    return sum;
}
/**
 * The titles of pending sessions that meet a minimum planned duration.
 *
 * Preconditions:
 * - All sessions satisfy the Session invariants.
 * - minMinutes is finite (it may be zero, negative, or fractional).
 *
 * @param sessions A sequence of study sessions.
 * @param minMinutes The smallest planned duration to include.
 * @returns Matching pending titles in original order, including equality at
 *          the threshold; [] if none match. The input is unchanged.
 */
export function pendingTitles(sessions: Session[], minMinutes: number): string[] {
    if (!sessions || sessions.length === 0) {
        return [];
    }
 return sessions.filter(s => s.kind === "pending" && s.plannedMinutes >= minMinutes).map(s => s.title);
}

/**
 * Creates an empty planner with the given capacity.
 *
 * Precondition: capacity is finite.
 *
 * Postconditions:
 * - Any returned Planner satisfies the Planner invariants.
 * - Each successful call creates independent private state.
 *
 * @param capacity The maximum number of sessions that can be stored.
 * @returns A new empty Planner, or an error ("invalid capacity") if capacity
 *          is not a positive whole number.
 */
export function makePlanner(capacity: number): Result<Planner, string> {
    if (!Number.isInteger(capacity) || capacity <= 0) {
        return { ok: false, error: "invalid capacity" };
    }
    let sessions: Session[] = [];
    const maxCapacity = capacity;
    const planner: Planner = { // 显式指定 planner 类型为 Planner
        add(session: Session): Result<void, string> {
            if (sessions.some(s => s.title === session.title)) {
                return { ok: false, error: "duplicate title" } as Result<void, string>;
            }
            if (sessions.length >= maxCapacity) {
                return { ok: false, error: "full" } as Result<void, string>;
            }
            sessions.push({ ...session });
            return { ok: true, value: undefined };
        },
        finish(title: string, actualMinutes: number): Result<void, string> {
            const index = sessions.findIndex(s => s.title === title);
            if (index === -1) {
                return { ok: false, error: "not found" } as Result<void, string>;
            }
            const target = sessions[index];
            if (target.kind === "done") {
                return { ok: false, error: "already done" } as Result<void, string>;
            }
            if (!Number.isFinite(actualMinutes) || !Number.isInteger(actualMinutes) || actualMinutes < 1 || actualMinutes > 120) {
                return { ok: false, error: "invalid minutes" } as Result<void, string>;
            }
            sessions[index] = { kind: "done", title: target.title, plannedMinutes: target.plannedMinutes, actualMinutes };
            return { ok: true, value: undefined };
        },
        getSessions(): Session[] {
            return sessions.map(s => ({ ...s }));
        }
    };
    return { ok: true, value: planner };
}