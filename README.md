# Activity Tasks: Maintaining a Study Planner

> As a student planning study sessions, I want to add and finish sessions without exceeding my planner's capacity, so that my schedule remains valid even when other code interacts with it.

This activity combines modelling data, maintaining invariants, processing arrays,
reasoning about mutation, and asynchronous file operations.

Files:

- `src/planner.ts`, `test/planner.test.ts` — data, collection operations, and protected state.
- `src/storage.ts`, `test/storage.test.ts` — asynchronous JSON file operations.
- `src/result.ts` — the provided Result type.

## Workflow

1. Let each data definition guide the functions that consume it.
2. Establish invariants at construction and preserve them through operations.
3. Write tests alongside each function, including boundaries and erroneous outcomes.
4. Try to break the guarantee by changing input objects and returned snapshots.
5. Re-run tests after each change.

**Time limit: 50 minutes. Total: 100 marks.** This is an original practice assessment, not an official exam or a prediction. Read this README and complete `src` and its tests in VS Code. No solutions are included.

## Before starting the timer

Unzip this folder and open it in VS Code. Use a Node version supporting your supplied dependencies (Node 24 is suitable). In the terminal at this folder's root:

```sh
npm install
npm run build
npm test
```

Dependency installation is outside the 50 minutes. Dependency versions are copied exactly from your uploaded package.json. If a version is unavailable, use your already-working course environment rather than changing versions during the timer. You can copy the exercise's src and data into a separate copy of that environment.

Start from the included config, or use your existing course config. `npm test` initially fails on TODO implementations; skipped `test.todo` entries are NOT completed tests. After completing Session, `npm run build` should type-check both source and tests. `npm test` runs Vitest; you may use `npm run test:watch` while working. No additional packages are needed. The copied lint scripts require your own course Biome config; lint is not part of this practice's marking.

Allowed: textbook L2–L7 and the supplied cheatsheet. For a timed diagnostic, work without AI or a solution. Use plain functions, types, arrays and closures; no classes, UI, chart.js, Zod, or course-toolkit imports. Vitest is used because it is in your provided dependencies. Throwing TODO placeholders and provided test helpers are scaffolding, not a requirement to design exception handling.

## Scenario and shared rules

A student stores study sessions in a planner. A session starts pending and can be finished once. Titles identify sessions using exact, case-sensitive equality. The empty title is allowed; do not trim or change titles.

A valid minute value is an integer in **[1, 120]**. Numeric inputs throughout the assessed tasks are guaranteed finite; no NaN or Infinity tests are required. Runtime inputs have their declared TypeScript shapes. The `kind` field is the discriminator.

| State | Required fields |
|---|---|
| Pending | `kind: "pending"`, `title: string`, `plannedMinutes: number` |
| Done | `kind: "done"`, `title: string`, `plannedMinutes: number`, `actualMinutes: number` |

Pending has no `actualMinutes` field. Do not model states using optional fields. The planner's invariant: its session count never exceeds capacity, titles are unique, and every stored minute value is valid.

## TASK 1 — Model and construct (8 min, 18 marks)

Replace `Session = unknown` with a precise tagged union (6 marks).

Implement `makeSession(title, minutes)` (6 marks): invalid minutes return exactly `{ ok: false, error: "invalid minutes" }`; otherwise return `{ ok: true, value: ... }` carrying a fresh pending session with the given title and planned minutes.

Complete the constructor boundary tests (6 marks). Include successful 1 and 120, failing -1/0/121/1.5, and unchanged title. The provided zero test can count toward this requirement.

**Done when:** Session represents both cases precisely, makeSession meets its contract, and its boundary tests pass.

## TASK 2 — Process collections (7 min, 16 marks)

`completedMinutes(sessions)` returns the sum of **actual** minutes of done sessions, ignoring pending sessions; an empty array returns 0 (5 marks).

`pendingTitles(sessions, minMinutes)` returns titles of pending sessions whose **plannedMinutes >= minMinutes**, in original order. `minMinutes` is any finite number, including zero or a decimal. Empty/no-match input returns [] (5 marks).

These functions must leave the input array and all its objects unchanged. Use array methods or `for...of`; no one particular method is required. Complete the array test with empty, mixed, threshold-equality and no-match cases, and check input remains unchanged (6 marks).

Example: for `data/a.json`, `completedMinutes` is 25 and `pendingTitles(..., 30)` is ["L5"].

**Done when:** both collection functions meet their contracts, including empty input and threshold equality, without changing the input.

## TASK 3 — Maintain state and protect invariants (23 min, 48 marks)

`makePlanner(capacity)` returns `{ ok: false, error: "invalid capacity" }` unless capacity is a positive integer. Otherwise it creates an initially empty planner and returns it in a successful Result (6 marks).

Keep the sessions in a **closure**; do not expose a writable state property. Operations mutate this planner, rather than returning a successor planner.

### add(session) (9 marks)

Precondition: the supplied Session has valid minute values. Accept pending OR done sessions. Error precedence:

1. A stored session has this title: `"duplicate title"`.
2. The planner already holds capacity sessions: `"full"`.

On success append a copy at the end and return `{ ok: true, value: undefined }`. Later changes to the supplied object must not affect stored state.

### finish(title, actualMinutes) (9 marks)

Error precedence:

1. No matching title: `"not found"`.
2. The matching session is already done: `"already done"`.
3. Actual minutes invalid: `"invalid minutes"`.

On success replace/convert the pending session to done, preserving title, planned minutes and array position, recording actualMinutes. Return `{ ok: true, value: undefined }`. It still occupies one capacity slot; finishing does not remove it. Every failed add/finish leaves all planner state unchanged.

### getSessions() and independence (8 marks)

Return a snapshot in insertion order: a fresh array containing fresh session objects. The caller may push/pop the returned array or change an object's fields without changing the planner. Separate planners must never share their private state. Since fields contain only primitives, you do not need a general deep-copy utility.

### Tests (16 marks)

Complete all planner test TODOs. Check successful values, exact errors, boundary cases, state after errors and transitions, input/output alias protection, and separate instances. In particular, test duplicate-title priority when full and not-found/already-done priority when minutes are invalid. One test may contain several assertions. Use a fresh planner per independent test.

**Done when:** construction and operations preserve all invariants, failed operations leave state unchanged, and input/output mutation tests pass.

## TASK 4 — Asynchronous file operations (8 min, 18 marks)

File precondition: each supplied path refers to a readable UTF-8 JSON file containing a valid Session array. You do not need to validate JSON or catch filesystem/parse errors. `decodeSessions` is provided to keep runtime validation outside L2–L7.

`loadCompletedMinutes(paths)` (7 marks): read all files, decode each, and return one completed-minute total per path. Start reads concurrently using **Promise.all**. Output order must match input path order, regardless of completion order. Empty input returns []; repeated paths produce repeated results. Do not hard-code sample filenames or answers.

`saveSessions(path, sessions)` (5 marks): write JSON representing the full given array. Its Promise must resolve only after the write finishes. JSON whitespace is not assessed. Do not change sessions. Do not create parent directories. No serialization of Planner functions is required.

Complete both storage test TODOs (6 marks). For load, include [] and paths in reversed/repeated order. For save, create a path inside `workspace()`, await save, then read/parse it and compare the entire array, including both states. Temporary-folder setup and cleanup are already provided.

**Done when:** reads are concurrent, totals preserve path order, save waits for completion, and asynchronous tests pass.

## Final self-check (4 min; total 50 min)

- Run `npm run build` and `npm test`; replace every `test.todo` with a real test.
- Check boundary equality, exact error strings and failure precedence.
- Check caller mutation cannot break the invariant.
- Check asynchronous tests await the operation and assert its result.

Suggested marking: Task 1 18 + Task 2 16 + Task 3 48 + Task 4 18 = 100. These are self-assessment weights, not a hidden autograder. Passing only the two provided smoke tests is insufficient. Count meaningful coverage rather than maximizing the number of test blocks.

## 中文使用说明

这是一个完整编程题，不是选择题。你需要读英文 specification，补全 `planner.ts`、`storage.ts` 和`test/` 中的两个 `.test.ts`；`result.ts` 已提供，不需要改。先安装依赖，再开 50 分钟计时。建议按 8 / 7 / 23 / 8 分钟完成四部分，最后 4 分钟检查。测试写在每部分过程中，不要全留到最后。

覆盖 L2 的 tagged union/narrowing；L3 的 invariant、Result、等价类和边界测试；L4 的 constructor/closure；L5 的数组处理；L6 的 mutation/aliasing；L7 的 async/await、Promise.all、文件和 JSON。为控制在 50 分钟内，没有再加入递归链表、排序、网络请求或计时器；这不是 L2–L7 每个知识点的穷尽清单。

如果超时，记录到 50 分钟时完成了哪些函数、哪些测试，以及剩余错误，再继续完成；这样才有诊断价值。做完可以把 src 发来批改。

## Sources

Exercise and marking scheme are original. Scope checked against:
- https://ubccpsc.github.io/210/part1/02_model-types.html
- https://ubccpsc.github.io/210/part1/03_checking-invariants.html
- https://ubccpsc.github.io/210/part1/04_maintaining-invariants.html
- https://ubccpsc.github.io/210/part1/05_arrays.html
- https://ubccpsc.github.io/210/part1/06_state-mutation.html
- https://ubccpsc.github.io/210/part1/07_async.html
- Your supplied CPSC 210 MT 2 Cheat Sheet and package(1).json.
