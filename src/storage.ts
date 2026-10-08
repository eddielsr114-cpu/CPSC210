import { readFile, writeFile } from "node:fs/promises";
import { completedMinutes, type Session } from "./planner";

/**
 * Decodes the stored representation of a sequence of study sessions.
 *
 * Precondition: text is valid JSON representing a valid Session array.
 *
 * @param text The JSON text read from a file.
 * @returns The decoded sessions.
 */
export function decodeSessions(text: string): Session[] {
    return JSON.parse(text);
}

/**
 * Loads the completed-minute total from each of several session files.
 *
 * Preconditions:
 * - Each path refers to a readable UTF-8 file.
 * - Each file contains valid JSON representing a valid Session array.
 *
 * Postconditions:
 * - Reads are started concurrently using Promise.all.
 * - Results follow path order, even if reads finish in another order.
 *
 * @param paths The files to read. Paths may be repeated.
 * @returns A Promise of one completed-minute total per path; [] for no paths.
 *          Filesystem/parse errors propagate; no error handling is required.
 * Effects: reads the file system; does not write files or change paths.
 */
export async function loadCompletedMinutes(paths: string[]): Promise<number[]> {
    const promises = paths.map(async (path) => {
        const content = await readFile(path, 'utf-8');
        const sessions = decodeSessions(content);
        return completedMinutes(sessions);
    });

    return Promise.all(promises);
}

/**
 * Saves study sessions as JSON text.
 *
 * Preconditions:
 * - sessions is a valid Session array.
 * - path is writable and its parent directory already exists.
 *
 * Postconditions:
 * - When the Promise fulfills, the full array has been written as JSON.
 * - sessions and its objects are unchanged.
 *
 * @param path The file to create or replace.
 * @param sessions The sessions to save.
 * @returns A Promise that fulfills with undefined after the write completes.
 *          Filesystem errors propagate; no error handling is required.
 * Modifies: the file system (creates or replaces the given file).
 */
export async function saveSessions(path: string, sessions: Session[]): Promise<void> {
    const jsonStr = JSON.stringify(sessions, null, 2);
    await writeFile(path, jsonStr, 'utf-8');
}