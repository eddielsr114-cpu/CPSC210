import { completedMinutes, makePlanner, makeSession, pendingTitles } from "../src/planner";
import type { Result } from "../src/result";
import { cons, empty, type List, length, list } from "@ubccpsc/210-toolkit/list";
import { assertOk, checkError, checkExpect, describe, test } from "@ubccpsc/210-toolkit/testing";

// Provided helper, following LA04's assertOk pattern.
// It unwraps a successful Result. An error causes test setup to fail immediately.
// This local helper uses no course toolkit dependency.

describe("makeSession", () => {
    test("rejects zero-minute sessions (provided smoke test)", () => {
        checkExpect(() => makeSession("zero", 0), { ok: false, error: "invalid minutes" });
    });
    test("valid sessions",() =>{
        checkExpect(() => makeSession("valid", 1), { ok: true, value: { kind: "pending", title: "valid", plannedMinutes: 60 } });
        checkExpect(() => makeSession("valid", 120), { ok: true, value: { kind: "pending", title: "valid", plannedMinutes: 60 } });
    })
    test("invalid sessions",() => {
        checkExpect(() => makeSession("invalid", 121), { ok: false, error: "invalid minutes" });
        checkExpect(() => makeSession("invalid", -1), { ok: false, error: "invalid minutes" });
        checkExpect(() => makeSession("invalid", 1.5), { ok: false, error: "invalid minutes" });
    })
    // Replace every test.todo with a real test and meaningful assertions.
    // A test may check several closely related examples.
});

// Test empty input, both states, boundary equality, and unchanged input.


describe("array operations", () => {
    test("completedMinutes: empty", () => {
        checkExpect(() => completedMinutes([]), 0);
    });
    test("completedMinutes: valid input", () => {
        checkExpect(() => completedMinutes([{ kind: "done", title: "A", plannedMinutes: 10, actualMinutes: 5 }, { kind: "pending", title: "B", plannedMinutes: 15 }]), 5);
        checkExpect(() => completedMinutes([{ kind: "done", title: "A", plannedMinutes: 10, actualMinutes: 5 }, { kind: "done", title: "B", plannedMinutes: 15, actualMinutes: 10 }]), 15);
    });
    test("no-match input",() => {
        checkExpect(() => completedMinutes([{ kind: "pending", title: "A", plannedMinutes: 10 }, { kind: "pending", title: "B", plannedMinutes: 114514 }]), 0);
    });
    test("mixed input",() => {
        checkExpect(() => completedMinutes([{ kind: "done", title: "A", plannedMinutes: 10, actualMinutes: 5 }, { kind: "pending", title: "B", plannedMinutes: 15 }, { kind: "done", title: "C", plannedMinutes: 20, actualMinutes: 10 }]), 15);
    });;
    test("pendingTitles: threshold and empty cases", () => {
        const sessions = [
            { kind: "pending" as const, title: "L1", plannedMinutes: 30 },
            { kind: "pending" as const, title: "L2", plannedMinutes: 50 },
            { kind: "done" as const, title: "L3", plannedMinutes: 40, actualMinutes: 35 },
        ];
        checkExpect(() => pendingTitles(sessions, 30), ["L1", "L2"]);
        checkExpect(() => pendingTitles(sessions, 31), ["L2"]);
        checkExpect(() => pendingTitles([], 30), []);
    });
});

// As in LA04, observe a planner through its operations rather than comparing
// objects containing functions. Use assertOk(makePlanner(...)) for setup.
//
// TODO: Implement each test below. Include assertions about state after errors.
//
describe("makePlanner and its operations", () => {
    test("planner: invalid capacities 0/-1/1.5; capacity 1 is valid", () => {
        checkExpect(() => makePlanner(0), { ok: false, error: "invalid capacity" });
        checkExpect(() => makePlanner(-5), { ok: false, error: "invalid capacity" });
        checkExpect(() => makePlanner(2.5), { ok: false, error: "invalid capacity" });
        
        const validPlannerResult = makePlanner(1);
        checkExpect(() => validPlannerResult.ok, true);
    });

    test("planner: duplicate title, exactly full, over capacity; check failure leaves state unchanged", () => {
        const planner = assertOk(makePlanner(1));
        const s1 = assertOk(makeSession("Math", 30));
        const s1Duplicate = assertOk(makeSession("Math", 45));
        const s2 = assertOk(makeSession("CS", 60));
        checkExpect(() => planner.add(s1), { ok: true, value: undefined });
        checkExpect(() => planner.getSessions().length, 1);
        checkExpect(() => planner.add(s1Duplicate), { ok: false, error: "duplicate title" });
        checkExpect(() => planner.getSessions().length, 1);
        checkExpect(() => planner.add(s2), { ok: false, error: "full" });
        checkExpect(() => planner.getSessions().length, 1);
    });
    test("finish: unknown title and already-done errors", () => {
        const planner = assertOk(makePlanner(2));
        const s1 = assertOk(makeSession("Math", 30)); 
        planner.add(s1);

        // 1. 未找到的标题
        checkExpect(() => planner.finish("Physics", 40), { ok: false, error: "not found" });

        // 成功完成一次
        planner.finish("Math", 40);

        // 2. 已经完成的再次完成触发 already done
        checkExpect(() => planner.finish("Math", 40), { ok: false, error: "already done" });
    });

    test("finish: minute boundaries and invalid values; check failed operation leaves state unchanged", () => {
        const planner = assertOk(makePlanner(1));
        const s1 = assertOk(makeSession("Math", 30)); 
        planner.add(s1);

        // 无效分钟数（边界外与小数）
        checkExpect(() => planner.finish("Math", 0), { ok: false, error: "invalid minutes" });
        checkExpect(() => planner.finish("Math", 121), { ok: false, error: "invalid minutes" });
        checkExpect(() => planner.finish("Math", 1.5), { ok: false, error: "invalid minutes" });

        // 验证失败后状态未改变（仍为 pending 状态，未被转成 done）
        const sessions = planner.getSessions();
        checkExpect(() => sessions[0].kind, "pending");

        // 有效边界值 1 和 120
        checkExpect(() => planner.finish("Math", 1), { ok: true, value: undefined });
    });

    test("finish: successful transition and completedMinutes after the transition", () => {
        const planner = assertOk(makePlanner(2));
        planner.add(assertOk(makeSession("Math", 30))); 
        planner.add(assertOk(makeSession("CS", 45))); 

        checkExpect(() => completedMinutes(planner.getSessions()), 0);

        planner.finish("Math", 25);
        checkExpect(() => completedMinutes(planner.getSessions()), 25);

        planner.finish("CS", 50);
        checkExpect(() => completedMinutes(planner.getSessions()), 75);
    });

    test("aliasing: changing the object passed to add cannot change planner state", () => {
        const planner = assertOk(makePlanner(1));
        const s = assertOk(makeSession("Math", 30)); 
        planner.add(s);

        // 修改传入的对象
        s.title = "HACKED";
        s.plannedMinutes = 120;

        const sessions = planner.getSessions();
        checkExpect(() => sessions[0].title, "Math");
        checkExpect(() => sessions[0].plannedMinutes, 30);
    });

    test("aliasing: changing returned array AND an element cannot change planner state", () => {
        const planner = assertOk(makePlanner(1));
        planner.add(assertOk(makeSession("Math", 30))); 

        const snapshot = planner.getSessions();
        snapshot.push(assertOk(makeSession("Extra", 10))); 
        snapshot[0].title = "MUTATED"; 

        const freshSnapshot = planner.getSessions();
        checkExpect(() => freshSnapshot.length, 1);
        checkExpect(() => freshSnapshot[0].title, "Math");
    });

    test("independence: two planners have separate state", () => {
        const p1 = assertOk(makePlanner(1));
        const p2 = assertOk(makePlanner(1));

        p1.add(assertOk(makeSession("Math", 30))); 

        checkExpect(() => p1.getSessions().length, 1);
        checkExpect(() => p2.getSessions().length, 0);
    });
});
