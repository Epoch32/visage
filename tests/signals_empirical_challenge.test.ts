import { describe, expect, it, mock } from "bun:test";
import { batch, createSelector, createStore, effect, signal } from "../src/signals";

describe("Teamwork Challenger M1 - Empirical Stress Harness", () => {
  describe("1. Store Array Mutations", () => {
    it("direct truncation via arr.length = 0 triggers length and truncated element observers", () => {
      const state = createStore({
        arr: ["apple", "banana", "cherry"]
      });

      let lengthRuns = 0;
      let elem0Runs = 0;
      let elem2Runs = 0;
      let keysRuns = 0;
      let forOfRuns = 0;
      let lastForOf: string[] = [];

      effect(() => {
        lengthRuns++;
        const _ = state.arr.length;
      });

      effect(() => {
        elem0Runs++;
        const _ = state.arr[0];
      });

      effect(() => {
        elem2Runs++;
        const _ = state.arr[2];
      });

      effect(() => {
        keysRuns++;
        const _ = Object.keys(state.arr);
      });

      effect(() => {
        forOfRuns++;
        const items: string[] = [];
        for (const item of state.arr) {
          items.push(item);
        }
        lastForOf = items;
      });

      expect(lengthRuns).toBe(1);
      expect(elem0Runs).toBe(1);
      expect(elem2Runs).toBe(1);
      expect(keysRuns).toBe(1);
      expect(forOfRuns).toBe(1);
      expect(lastForOf).toEqual(["apple", "banana", "cherry"]);

      // Directly truncate array to 0
      state.arr.length = 0;

      expect(state.arr.length).toBe(0);
      expect(lengthRuns).toBe(2);
      expect(forOfRuns).toBe(2);
      expect(lastForOf).toEqual([]);
    });

    it("splice, pop, and shift trigger length and keys observers", () => {
      const state = createStore({
        arr: [1, 2, 3]
      });

      let lengthRuns = 0;
      let keysRuns = 0;

      effect(() => {
        lengthRuns++;
        const _ = state.arr.length;
      });

      effect(() => {
        keysRuns++;
        const _ = Object.keys(state.arr);
      });

      expect(lengthRuns).toBe(1);
      expect(keysRuns).toBe(1);

      // pop
      state.arr.pop();
      expect(lengthRuns).toBe(2);
      expect(keysRuns).toBe(2);

      // shift
      state.arr.shift();
      expect(lengthRuns).toBe(3);
      expect(keysRuns).toBe(3);

      // splice
      state.arr.splice(0, 1);
      expect(lengthRuns).toBe(4);
      expect(keysRuns).toBe(4);
    });

    it("direct truncation via arr.length = 1 retains index 0 and truncates index 1, 2", () => {
      const state = createStore({
        arr: [100, 200, 300]
      });

      let lengthRuns = 0;
      let elem0Runs = 0;
      let elem1Runs = 0;
      let mapRuns = 0;
      let mapped: number[] = [];

      effect(() => {
        lengthRuns++;
        const _ = state.arr.length;
      });

      effect(() => {
        elem0Runs++;
        const _ = state.arr[0];
      });

      effect(() => {
        elem1Runs++;
        const _ = state.arr[1];
      });

      effect(() => {
        mapRuns++;
        mapped = state.arr.map((x) => x * 2);
      });

      expect(lengthRuns).toBe(1);
      expect(elem0Runs).toBe(1);
      expect(elem1Runs).toBe(1);
      expect(mapRuns).toBe(1);
      expect(mapped).toEqual([200, 400, 600]);

      // Truncate to length 1
      state.arr.length = 1;

      expect(state.arr.length).toBe(1);
      expect(lengthRuns).toBe(2);
      expect(mapRuns).toBe(2);
      expect(mapped).toEqual([200]);
      // Element 0 was not modified
      expect(elem0Runs).toBe(1);
    });

    it("sparse array index setting arr[10] = 'val' triggers length, keys, and index observers", () => {
      const state = createStore({
        arr: ["first", "second"]
      });

      let lengthRuns = 0;
      let keysRuns = 0;
      let index10Runs = 0;
      let index0Runs = 0;

      effect(() => {
        lengthRuns++;
        const _ = state.arr.length;
      });

      effect(() => {
        keysRuns++;
        const _ = Object.keys(state.arr);
      });

      effect(() => {
        index10Runs++;
        const _ = state.arr[10];
      });

      effect(() => {
        index0Runs++;
        const _ = state.arr[0];
      });

      expect(lengthRuns).toBe(1);
      expect(keysRuns).toBe(1);
      expect(index10Runs).toBe(1);
      expect(index0Runs).toBe(1);

      // Set sparse index 10
      state.arr[10] = "eleventh";

      expect(state.arr.length).toBe(11);
      expect(lengthRuns).toBe(2);
      expect(keysRuns).toBe(2);
      expect(index10Runs).toBe(2);
      expect(index0Runs).toBe(1); // untouched index 0

      // Now mutate existing sparse index 10: length and keys MUST NOT trigger!
      state.arr[10] = "updated-eleventh";
      expect(state.arr[10]).toBe("updated-eleventh");
      expect(index10Runs).toBe(3);
      expect(lengthRuns).toBe(2); // unchanged
      expect(keysRuns).toBe(2); // unchanged
      expect(index0Runs).toBe(1);
    });

    it("sort() updates rearranged indices reactively and triggers iteration observers", () => {
      const state = createStore({
        arr: [30, 10, 20]
      });

      let idx0Runs = 0;
      let idx1Runs = 0;
      let idx2Runs = 0;
      let lengthRuns = 0;
      let forOfRuns = 0;
      let result: number[] = [];

      effect(() => {
        idx0Runs++;
        const _ = state.arr[0];
      });

      effect(() => {
        idx1Runs++;
        const _ = state.arr[1];
      });

      effect(() => {
        idx2Runs++;
        const _ = state.arr[2];
      });

      effect(() => {
        lengthRuns++;
        const _ = state.arr.length;
      });

      effect(() => {
        forOfRuns++;
        result = [...state.arr];
      });

      expect(result).toEqual([30, 10, 20]);
      expect(idx0Runs).toBe(1);
      expect(idx1Runs).toBe(1);
      expect(idx2Runs).toBe(1);
      expect(lengthRuns).toBe(1);
      expect(forOfRuns).toBe(1);

      // Sort numbers ascending
      state.arr.sort((a, b) => a - b);

      expect(state.arr[0]).toBe(10);
      expect(state.arr[1]).toBe(20);
      expect(state.arr[2]).toBe(30);
      expect(result).toEqual([10, 20, 30]);

      // Element observers for modified positions ran
      expect(idx0Runs).toBeGreaterThan(1);
      expect(idx1Runs).toBeGreaterThan(1);
      expect(idx2Runs).toBeGreaterThan(1);
      // Length did NOT change
      expect(lengthRuns).toBe(1);
    });

    it("reverse() updates swapped positions reactively", () => {
      const state = createStore({
        arr: ["A", "B", "C"]
      });

      let item0 = "";
      let item2 = "";
      let item0Runs = 0;
      let item2Runs = 0;
      let lengthRuns = 0;

      effect(() => {
        item0Runs++;
        item0 = state.arr[0] ?? "";
      });

      effect(() => {
        item2Runs++;
        item2 = state.arr[2] ?? "";
      });

      effect(() => {
        lengthRuns++;
        const _ = state.arr.length;
      });

      expect(item0).toBe("A");
      expect(item2).toBe("C");
      expect(item0Runs).toBe(1);
      expect(item2Runs).toBe(1);
      expect(lengthRuns).toBe(1);

      state.arr.reverse();

      expect(item0).toBe("C");
      expect(item2).toBe("A");
      expect(item0Runs).toBe(2);
      expect(item2Runs).toBe(2);
      expect(lengthRuns).toBe(1); // Length never changed
    });

    it("fill() updates targeted elements without length changes", () => {
      const state = createStore({
        arr: [1, 2, 3, 4]
      });

      let elem1 = 0;
      let elem1Runs = 0;
      let lengthRuns = 0;

      effect(() => {
        elem1Runs++;
        elem1 = state.arr[1]!;
      });

      effect(() => {
        lengthRuns++;
        const _ = state.arr.length;
      });

      expect(elem1).toBe(2);
      expect(elem1Runs).toBe(1);
      expect(lengthRuns).toBe(1);

      state.arr.fill(0, 1, 3); // fill index 1 and 2 with 0

      expect(state.arr).toEqual([1, 0, 0, 4]);
      expect(elem1).toBe(0);
      expect(elem1Runs).toBe(2);
      expect(lengthRuns).toBe(1); // unchanged
    });

    it("iteration observers (for...of, Object.keys, map) behave correctly on mutation", () => {
      const state = createStore({
        arr: ["x", "y"]
      });

      let forOfCount = 0;
      let keysCount = 0;
      let mapCount = 0;

      effect(() => {
        forOfCount++;
        for (const _ of state.arr) {
        }
      });

      effect(() => {
        keysCount++;
        const _ = Object.keys(state.arr);
      });

      effect(() => {
        mapCount++;
        const _ = state.arr.map((item) => item);
      });

      expect(forOfCount).toBe(1);
      expect(keysCount).toBe(1);
      expect(mapCount).toBe(1);

      // Mutate existing index:
      // - forOfCount re-runs because for..of read state.arr[0]
      // - mapCount re-runs because map read state.arr[0]
      // - keysCount MUST NOT re-run because Object.keys only checks STORE_ITERATE, which is untouched!
      state.arr[0] = "X_NEW";

      expect(forOfCount).toBe(2);
      expect(mapCount).toBe(2);
      expect(keysCount).toBe(1); // Verified! Existing index does not trigger Object.keys!

      // Adding element triggers all three:
      state.arr.push("z");
      expect(forOfCount).toBe(3);
      expect(mapCount).toBe(3);
      expect(keysCount).toBe(2);
    });
  });

  describe("2. Existing Index Mutation Isolation", () => {
    it("confirms arr[0] = x does NOT trigger STORE_ITERATE or length observers", () => {
      const state = createStore({
        arr: [10, 20, 30]
      });

      let lengthRuns = 0;
      let keysRuns = 0;
      let index0Runs = 0;
      let index1Runs = 0;

      effect(() => {
        lengthRuns++;
        const _ = state.arr.length;
      });

      effect(() => {
        keysRuns++;
        const _ = Object.keys(state.arr);
      });

      effect(() => {
        index0Runs++;
        const _ = state.arr[0];
      });

      effect(() => {
        index1Runs++;
        const _ = state.arr[1];
      });

      expect(lengthRuns).toBe(1);
      expect(keysRuns).toBe(1);
      expect(index0Runs).toBe(1);
      expect(index1Runs).toBe(1);

      // Perform 10 mutations to existing index 0
      for (let i = 1; i <= 10; i++) {
        state.arr[0] = 100 + i;
      }

      expect(state.arr[0]).toBe(110);
      expect(index0Runs).toBe(11);
      expect(index1Runs).toBe(1); // untouched
      expect(lengthRuns).toBe(1); // strictly 1
      expect(keysRuns).toBe(1); // strictly 1
    });

    it("confirms setting same value to existing index is a no-op", () => {
      const state = createStore({
        arr: ["hello", "world"]
      });

      let index0Runs = 0;
      effect(() => {
        index0Runs++;
        const _ = state.arr[0];
      });

      expect(index0Runs).toBe(1);
      state.arr[0] = "hello"; // Same value
      expect(index0Runs).toBe(1); // Not dirty
    });
  });

  describe("3. Selector Key Matching, Custom Equality, Key Changes, and Subscriber Disposal", () => {
    it("supports multi-match custom equality where multiple keys match", () => {
      const role = signal("admin");
      // Selector: matches keys that are covered by current role
      const hasPermission = createSelector(role, (key: string, currRole: string) => {
        if (currRole === "admin") return true;
        if (currRole === "editor") return key === "edit" || key === "view";
        return key === "view";
      });

      let viewPerm = false;
      let editPerm = false;
      let adminPerm = false;
      let viewRuns = 0;
      let editRuns = 0;
      let adminRuns = 0;

      effect(() => {
        viewRuns++;
        viewPerm = hasPermission("view");
      });

      effect(() => {
        editRuns++;
        editPerm = hasPermission("edit");
      });

      effect(() => {
        adminRuns++;
        adminPerm = hasPermission("delete");
      });

      expect(viewPerm).toBe(true);
      expect(editPerm).toBe(true);
      expect(adminPerm).toBe(true);
      expect(viewRuns).toBe(1);
      expect(editRuns).toBe(1);
      expect(adminRuns).toBe(1);

      // Change role to editor: delete becomes false; view and edit remain true!
      role.set("editor");

      expect(viewPerm).toBe(true);
      expect(editPerm).toBe(true);
      expect(adminPerm).toBe(false);

      // adminPerm ("delete") was toggled (true -> false), so adminRuns ran!
      expect(adminRuns).toBe(2);
      // view and edit did not change match status (both still true), so their effects did NOT re-run!
      expect(viewRuns).toBe(1);
      expect(editRuns).toBe(1);

      // Change role to viewer: edit becomes false, view remains true
      role.set("viewer");
      expect(viewPerm).toBe(true);
      expect(editPerm).toBe(false);
      expect(adminPerm).toBe(false);

      expect(viewRuns).toBe(1); // still true!
      expect(editRuns).toBe(2); // toggled to false!
      expect(adminRuns).toBe(2); // still false!
    });

    it("cleans up disposed subscriber from selector dependency and unregisters", () => {
      const selectedId = signal<number | null>(1);
      const isSelected = createSelector(selectedId);

      let item1Val = false;
      let item1Runs = 0;
      let item2Val = false;
      let item2Runs = 0;

      const disposeItem1 = effect(() => {
        item1Runs++;
        item1Val = isSelected(1);
      });

      const disposeItem2 = effect(() => {
        item2Runs++;
        item2Val = isSelected(2);
      });

      expect(item1Val).toBe(true);
      expect(item2Val).toBe(false);
      expect(item1Runs).toBe(1);
      expect(item2Runs).toBe(1);

      // Dispose item 1 subscriber
      disposeItem1();

      // Change selection to 2
      selectedId.set(2);
      expect(item2Val).toBe(true);
      expect(item2Runs).toBe(2);
      // Item 1 was disposed, should NOT run
      expect(item1Runs).toBe(1);

      // Change selection back to 1
      selectedId.set(1);
      expect(item2Val).toBe(false);
      expect(item2Runs).toBe(3);
      // Item 1 still does not run
      expect(item1Runs).toBe(1);

      disposeItem2();
    });

    it("handles Rapid key changes and avoids stale notifications", () => {
      const active = signal<string>("A");
      const isActive = createSelector(active);

      const logA: boolean[] = [];
      const logB: boolean[] = [];
      const logC: boolean[] = [];

      effect(() => {
        logA.push(isActive("A"));
      });
      effect(() => {
        logB.push(isActive("B"));
      });
      effect(() => {
        logC.push(isActive("C"));
      });

      expect(logA).toEqual([true]);
      expect(logB).toEqual([false]);
      expect(logC).toEqual([false]);

      // Rapidly switch A -> B -> C -> A
      batch(() => {
        active.set("B");
        active.set("C");
      });

      expect(logA).toEqual([true, false]);
      expect(logB).toEqual([false]); // B was never flushed as active due to batching
      expect(logC).toEqual([false, true]);
    });
  });

  describe("4. Circular Dependency Detection in signal.ts (warnedCyclicSubscribers)", () => {
    it("detects direct cyclic signal updates within effect and warns once", () => {
      const count = signal(0);
      const warnSpy = mock();
      const origWarn = console.warn;
      console.warn = warnSpy;

      try {
        effect(() => {
          // Cyclic: reading count() registers subscriber, then setting count() synchronously
          const val = count();
          if (val < 5) {
            count.set(val + 1);
          }
        });

        // Must have logged the cyclic warning
        expect(warnSpy).toHaveBeenCalled();
        const firstWarning = warnSpy.mock.calls[0]?.[0] as string;
        expect(firstWarning).toContain("[Visage Reactivity] Cyclic update detected");

        // The cyclic warning should be logged only ONCE per subscriber, not on every iteration
        expect(warnSpy.mock.calls.length).toBe(1);
      } finally {
        console.warn = origWarn;
      }
    });

    it("verifies warnedCyclicSubscribers WeakSet tracking in system context", () => {
      const a = signal(10);

      const stop = effect(() => {
        const val = a();
        if (val === 10) {
          a.set(20);
        }
      });

      // After cycle triggered, subscriber is in warnedCyclicSubscribers
      // Now setting 'a' again inside effect should not trigger duplicate warning
      const warnMock = mock();
      const origWarn = console.warn;
      console.warn = warnMock;
      try {
        a.set(30);
        expect(warnMock).not.toHaveBeenCalled();
      } finally {
        console.warn = origWarn;
        stop();
      }
    });

    it("circuit breaker throws when cycle exceeds MAX_FLUSH_COUNT", () => {
      const loopSignal = signal(0);
      const origWarn = console.warn;
      console.warn = () => {}; // suppress console noise

      try {
        expect(() => {
          effect(() => {
            loopSignal.set(loopSignal() + 1);
          });
        }).toThrow("Maximum update depth exceeded");
      } finally {
        console.warn = origWarn;
      }
    });
  });

  describe("5. High-Scale Stress & Adversarial Load", () => {
    it("handles 1,000 elements in store array with isolated updates", () => {
      const initial = Array.from({ length: 1000 }, (_, i) => `item_${i}`);
      const state = createStore({ list: initial });

      let midRuns = 0;
      let lastRuns = 0;
      let lengthRuns = 0;

      effect(() => {
        midRuns++;
        const _ = state.list[500];
      });

      effect(() => {
        lastRuns++;
        const _ = state.list[999];
      });

      effect(() => {
        lengthRuns++;
        const _ = state.list.length;
      });

      expect(midRuns).toBe(1);
      expect(lastRuns).toBe(1);
      expect(lengthRuns).toBe(1);

      // Mutate 100 different indices that are NOT 500 or 999
      for (let i = 0; i < 100; i++) {
        state.list[i] = `modified_${i}`;
      }

      // Middle and last element observers must NOT have run!
      expect(midRuns).toBe(1);
      expect(lastRuns).toBe(1);
      expect(lengthRuns).toBe(1);

      // Mutate middle element
      state.list[500] = "MODIFIED_MID";
      expect(midRuns).toBe(2);
      expect(lastRuns).toBe(1);
      expect(lengthRuns).toBe(1);

      // Push 100 new items
      for (let i = 0; i < 100; i++) {
        state.list.push(`new_${i}`);
      }
      expect(state.list.length).toBe(1100);
      expect(lengthRuns).toBe(101); // each push changed length
      expect(midRuns).toBe(2); // mid untouched
    });

    it("stress tests selector with 2,000 keys ensuring strict O(1) subscriber wakeups", () => {
      const selectedId = signal<number>(0);
      const isSelected = createSelector(selectedId);

      const runCounts = new Uint16Array(2000);
      const disposers: Array<() => void> = [];

      for (let i = 0; i < 2000; i++) {
        const id = i;
        const stop = effect(() => {
          runCounts[id] = (runCounts[id] ?? 0) + 1;
          isSelected(id);
        });
        disposers.push(stop);
      }

      // All 2,000 ran initial setup
      for (let i = 0; i < 2000; i++) {
        expect(runCounts[i]).toBe(1);
      }

      // Select item 1337:
      // ONLY item 0 (previous) and item 1337 (next) should run!
      selectedId.set(1337);

      expect(runCounts[0]).toBe(2);
      expect(runCounts[1337]).toBe(2);

      // Verify random sample of other items were NOT notified
      expect(runCounts[1]).toBe(1);
      expect(runCounts[500]).toBe(1);
      expect(runCounts[1000]).toBe(1);
      expect(runCounts[1999]).toBe(1);

      // Dispose subscribers 1,500 to 1,999 (item 1337 remains active!)
      for (let i = 1500; i < 2000; i++) {
        disposers[i]!();
      }

      // Select item 1500 (which was disposed)
      selectedId.set(1500);

      // Item 1337 was previous and active -> notifies and runs!
      expect(runCounts[1337]).toBe(3);
      // Item 1500 was disposed -> must NOT run!
      expect(runCounts[1500]).toBe(1);

      // Clean up remaining
      for (let i = 0; i < 1500; i++) {
        disposers[i]!();
      }
    });

    it("verifies DependencyTracker source clearing under dynamic dependency branching", () => {
      const toggle = signal(true);
      const a = signal("A");
      const b = signal("B");
      const c = signal("C");
      const d = signal("D");

      let runs = 0;
      let result = "";

      // Effect dynamically switches between 4 sources and 1 source
      const stop = effect(() => {
        runs++;
        if (toggle()) {
          result = `${a()}-${b()}-${c()}-${d()}`;
        } else {
          result = a();
        }
      });

      expect(runs).toBe(1);
      expect(result).toBe("A-B-C-D");

      // Switch to false (branches to only 1 source: toggle + a)
      toggle.set(false);
      expect(runs).toBe(2);
      expect(result).toBe("A");

      // Now mutating b, c, or d MUST NOT trigger effect!
      b.set("B_MOD");
      c.set("C_MOD");
      d.set("D_MOD");
      expect(runs).toBe(2); // Verified: zero stale source subscriptions!

      // Mutating 'a' still triggers it
      a.set("A_MOD");
      expect(runs).toBe(3);
      expect(result).toBe("A_MOD");

      // Switch back to true (promotes back to 4+ sources)
      toggle.set(true);
      expect(runs).toBe(4);
      expect(result).toBe("A_MOD-B_MOD-C_MOD-D_MOD");

      // Now mutating b DOES trigger it
      b.set("B2");
      expect(runs).toBe(5);
      expect(result).toBe("A_MOD-B2-C_MOD-D_MOD");

      stop();
    });
  });
});
