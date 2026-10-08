/**
 * The outcome of an operation: either a successful value or an error.
 *
 * Check ok before accessing value or error so TypeScript can narrow the case.
 * T is the successful value type; E is the error type.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
