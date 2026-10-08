import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { loadCompletedMinutes, saveSessions } from "../src/storage";

// Temporary-directory plumbing is provided; no need to learn these APIs for this exam.
const directories: string[] = [];
async function workspace(): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), "cpsc210-mt2-"));
    directories.push(directory);
    return directory;
}
afterEach(async () => {
    await Promise.all(directories.map(directory => rm(directory, { recursive: true, force: true })));
    directories.length = 0;
});

// Asynchronous tests must await the operation before checking its outcome.
describe("file operations", () => {
    test("loads sample data (provided smoke test)", async () => {
        expect(await loadCompletedMinutes(["data/a.json", "data/b.json"])).toEqual([25, 10]);
    });

    test("load: empty paths returns []; multiple files preserve input path order including repeated path", async () => {
        // 测试空路径返回空数组
        expect(await loadCompletedMinutes([])).toEqual([]);

        // 测试包含重复路径、颠倒顺序的路径是否能正确保持输入路径的顺序并计算结果
        // 根据 smoke test，data/a.json -> 25，data/b.json -> 10
        expect(await loadCompletedMinutes(["data/b.json", "data/a.json", "data/b.json"])).toEqual([10, 25, 10]);
    });

    test("save: use workspace() and join(), await save, read and JSON.parse to check full content", async () => {
        const dir = await workspace();
        const filePath = join(dir, "test-sessions.json");

        const sessions = [
            { kind: "pending" as const, title: "Math", plannedMinutes: 60 },
            { kind: "done" as const, title: "CS", plannedMinutes: 90, actualMinutes: 85 }
        ];

        // 异步等待保存完成
        await saveSessions(filePath, sessions);

        // 读取文件内容并解析
        const fileContent = await readFile(filePath, "utf-8");
        const parsedSessions = JSON.parse(fileContent);

        // 验证完整内容（包括两种状态）是否完全一致
        expect(parsedSessions).toEqual(sessions);
    });
});