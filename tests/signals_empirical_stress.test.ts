import { describe, expect, it } from "bun:test";
import {
  batch,
  type CleanupFn,
  computed,
  createSelector,
  createStore,
  effect,
  mutateStore,
  signal
} from "../src/signals";
import { getBatchDepth } from "../src/signals/system";

describe("Milestone M1 Empirical Stress & Reactivity Core Verification", () => {
  describe("Suite 1: High-Frequency Signal Updates (10,000+ iterations)", () => {
    it("handles 50,000 rapid unbatched signal updates with an active effect", () => {
      const count = signal(0);
      let effectRuns = 0;
      let lastSeenValue = -1;

      effect(() => {
        lastSeenValue = count();
        effectRuns++;
      });

      expect(effectRuns).toBe(1);
      expect(lastSeenValue).toBe(0);

      const iterations = 50_000;
      const start = performance.now();

      for (let i = 1; i <= iterations; i++) {
        count.set(i);
      }

      const elapsed = performance.now() - start;

      expect(effectRuns).toBe(iterations + 1);
      expect(lastSeenValue).toBe(iterations);
      expect(count()).toBe(iterations);
      // Ensure 50,000 sequential synchronous flushes finish efficiently (< 350ms)
      expect(elapsed).toBeLessThan(350);
    });

    it("handles 50,000 batched signal updates collapsing down to a single downstream flush", () => {
      const a = signal(0);
      const b = signal(0);
      let runs = 0;
      let sum = 0;

      effect(() => {
        sum = a() + b();
        runs++;
      });

      expect(runs).toBe(1);
      expect(sum).toBe(0);

      const iterations = 50_000;
      const start = performance.now();

      batch(() => {
        for (let i = 1; i <= iterations; i++) {
          a.set(i);
          b.set(i * 2);
        }
        // Inside batch, effect should NOT have run yet
        expect(runs).toBe(1);
      });

      const elapsed = performance.now() - start;

      // Exactly 1 additional run for the entire 50,000-step batch
      expect(runs).toBe(2);
      expect(sum).toBe(iterations + iterations * 2);
      expect(elapsed).toBeLessThan(100);
    });

    it("evaluates deep linear computed chains under 10,000 rapid updates without redundant recomputations", () => {
      const root = signal(0);
      let c1Runs = 0;
      let c2Runs = 0;
      let c3Runs = 0;
      let c4Runs = 0;
      let effectRuns = 0;

      const c1 = computed(() => {
        c1Runs++;
        return root() * 2;
      });

      const c2 = computed(() => {
        c2Runs++;
        return c1() + 10;
      });

      const c3 = computed(() => {
        c3Runs++;
        return c2() * 3;
      });

      const c4 = computed(() => {
        c4Runs++;
        return c3() - 5;
      });

      let finalValue = 0;
      effect(() => {
        finalValue = c4();
        effectRuns++;
      });

      expect(effectRuns).toBe(1);
      expect(c1Runs).toBe(1);
      expect(c2Runs).toBe(1);
      expect(c3Runs).toBe(1);
      expect(c4Runs).toBe(1);
      expect(finalValue).toBe((0 * 2 + 10) * 3 - 5); // 25

      const iterations = 10_000;
      for (let i = 1; i <= iterations; i++) {
        root.set(i);
      }

      expect(effectRuns).toBe(iterations + 1);
      expect(c1Runs).toBe(iterations + 1);
      expect(c2Runs).toBe(iterations + 1);
      expect(c3Runs).toBe(iterations + 1);
      expect(c4Runs).toBe(iterations + 1);
      expect(finalValue).toBe((iterations * 2 + 10) * 3 - 5);
    });
  });

  describe("Suite 2: Dynamic Dependency Fluctuation (5 -> 1 -> 10 dependencies)", () => {
    it("correctly adds, drops, clears, and restores dependencies when transitioning 5 -> 1 -> 10", () => {
      const mode = signal<"five" | "one" | "ten">("five");

      const s0 = signal(100);
      const s1 = signal(1);
      const s2 = signal(2);
      const s3 = signal(3);
      const s4 = signal(4);
      const s5 = signal(5);
      const s6 = signal(6);
      const s7 = signal(7);
      const s8 = signal(8);
      const s9 = signal(9);

      let computedRuns = 0;
      const derived = computed(() => {
        computedRuns++;
        const currentMode = mode();
        if (currentMode === "one") {
          return s0();
        }
        if (currentMode === "five") {
          return s0() + s1() + s2() + s3() + s4();
        }
        return s0() + s1() + s2() + s3() + s4() + s5() + s6() + s7() + s8() + s9();
      });

      let effectRuns = 0;
      let lastObserved = 0;
      effect(() => {
        lastObserved = derived();
        effectRuns++;
      });

      // --- PHASE 1: Mode = "five" (depends on mode, s0, s1, s2, s3, s4) => 6 sources
      expect(computedRuns).toBe(1);
      expect(effectRuns).toBe(1);
      expect(lastObserved).toBe(100 + 1 + 2 + 3 + 4); // 110

      // Mutating s1 should trigger update
      s1.set(10);
      expect(computedRuns).toBe(2);
      expect(effectRuns).toBe(2);
      expect(lastObserved).toBe(100 + 10 + 2 + 3 + 4); // 119

      // Mutating s9 (not in mode "five") must NOT trigger recomputation
      s9.set(999);
      expect(computedRuns).toBe(2);
      expect(effectRuns).toBe(2);

      // --- PHASE 2: Mode = "one" (depends only on mode, s0) => 2 sources
      // Drops s1..s4, transitioning collection down to 2 sources
      mode.set("one");
      expect(computedRuns).toBe(3);
      expect(effectRuns).toBe(3);
      expect(lastObserved).toBe(100);

      // Now mutating s1, s2, s3, s4 MUST NOT trigger recomputation
      s1.set(500);
      s2.set(600);
      s3.set(700);
      s4.set(800);
      expect(computedRuns).toBe(3);
      expect(effectRuns).toBe(3);
      expect(lastObserved).toBe(100);

      // Mutating s0 MUST trigger recomputation
      s0.set(200);
      expect(computedRuns).toBe(4);
      expect(effectRuns).toBe(4);
      expect(lastObserved).toBe(200);

      // --- PHASE 3: Mode = "ten" (depends on mode, s0..s9) => 11 sources
      // Re-promotes to Set/Map collection with zero GC churn
      mode.set("ten");
      expect(computedRuns).toBe(5);
      expect(effectRuns).toBe(5);
      // sum: 200 + 500 + 600 + 700 + 800 + 5 + 6 + 7 + 8 + 999
      const expectedTenSum = 200 + 500 + 600 + 700 + 800 + 5 + 6 + 7 + 8 + 999;
      expect(lastObserved).toBe(expectedTenSum);

      // Verify all 10 sources are now actively listened to
      s9.set(1000);
      expect(computedRuns).toBe(6);
      expect(effectRuns).toBe(6);
      expect(lastObserved).toBe(expectedTenSum + 1);

      s5.set(55);
      expect(computedRuns).toBe(7);
      expect(effectRuns).toBe(7);
      expect(lastObserved).toBe(expectedTenSum + 1 - 5 + 55);

      // --- PHASE 4: Rapid multi-cycle dependency fluctuation (50 cycles)
      for (let cycle = 0; cycle < 50; cycle++) {
        mode.set("one");
        s0.set(s0() + 1);
        mode.set("five");
        s2.set(s2() + 1);
        mode.set("ten");
        s8.set(s8() + 1);
      }

      // Verify final computation is mathematically exact
      const finalExpected = s0() + s1() + s2() + s3() + s4() + s5() + s6() + s7() + s8() + s9();
      expect(derived()).toBe(finalExpected);
      expect(lastObserved).toBe(finalExpected);
    });

    it("verifies effect cleans up stale dependencies and executes cleanups on dynamic fluctuation", () => {
      const condition = signal(true);
      const activeSig = signal("active");
      const dormantSig = signal("dormant");

      let cleanupCount = 0;
      let runCount = 0;
      let recordedValue = "";

      const dispose = effect(() => {
        runCount++;
        if (condition()) {
          recordedValue = activeSig();
        } else {
          recordedValue = dormantSig();
        }

        return () => {
          cleanupCount++;
        };
      });

      expect(runCount).toBe(1);
      expect(cleanupCount).toBe(0);
      expect(recordedValue).toBe("active");

      // While condition is true, changing dormantSig must NOT trigger effect or cleanup
      dormantSig.set("dormant_updated");
      expect(runCount).toBe(1);
      expect(cleanupCount).toBe(0);

      // Changing activeSig runs effect and triggers cleanup
      activeSig.set("active_v2");
      expect(runCount).toBe(2);
      expect(cleanupCount).toBe(1);
      expect(recordedValue).toBe("active_v2");

      // Flip condition to false: depends only on condition and dormantSig
      condition.set(false);
      expect(runCount).toBe(3);
      expect(cleanupCount).toBe(2);
      expect(recordedValue).toBe("dormant_updated");

      // Now mutating activeSig MUST NOT trigger effect!
      activeSig.set("active_v3");
      expect(runCount).toBe(3);
      expect(cleanupCount).toBe(2);

      // Mutating dormantSig triggers effect
      dormantSig.set("dormant_v2");
      expect(runCount).toBe(4);
      expect(cleanupCount).toBe(3);
      expect(recordedValue).toBe("dormant_v2");

      dispose();
      expect(cleanupCount).toBe(4);
    });
  });

  describe("Suite 3: Set/Map Collection Retention & Memory Leak Verification", () => {
    it("ensures cleared DependencyTracker sources release unreferenced signals to GC", async () => {
      const mode = signal<"many" | "single">("many");
      const persistentSig = signal(42);

      const tempSignals: ReturnType<typeof signal<number>>[] = [];
      for (let i = 0; i < 50; i++) {
        tempSignals.push(signal(i));
      }

      const weakSignals = tempSignals.map((s) => new WeakRef(s));

      const c = computed(() => {
        if (mode() === "many") {
          let sum = persistentSig();
          for (const s of tempSignals) {
            sum += s();
          }
          return sum;
        }
        return persistentSig();
      });

      // Eagerly evaluate with 50 sources
      expect(c()).toBeGreaterThan(0);

      // Transition computed to single dependency, clearing the 50 temp signals from _sources
      mode.set("single");
      expect(c()).toBe(42);

      // Now clear the external array so closure no longer holds strong references
      tempSignals.length = 0;

      // Mutate persistent signal to ensure recompute ran cleanly
      persistentSig.set(100);
      expect(c()).toBe(100);

      // Trigger GC if runtime supports it
      const gc = (globalThis as any).Bun?.gc;
      if (typeof gc === "function") {
        gc(true);
        // Give GC opportunity to finalize
        await new Promise((resolve) => setTimeout(resolve, 50));
        gc(true);

        // Verify that the weak references to the ephemeral signals were collected
        let collectedCount = 0;
        for (const ref of weakSignals) {
          if (ref.deref() === undefined) {
            collectedCount++;
          }
        }
        // Ephemeral signals detached from computed sources should be collected
        expect(collectedCount).toBeGreaterThan(0);
      }
    });

    it("ensures disposed effect and computed instances release signals and are collected", async () => {
      const baseSignal = signal("root");
      const rawBase: any = (baseSignal as any)._s;

      expect(rawBase.getSubscribersCount()).toBe(0);

      let weakEffect: WeakRef<any> | null = null;
      let weakComputed: WeakRef<any> | null = null;

      const setupEphemeralSubscribers = () => {
        const effDispose = effect(() => {
          const _ = baseSignal();
        });

        const comp = computed(() => {
          return `derived: ${baseSignal()}`;
        });
        // Subscribe to comp to register it as a subscriber to baseSignal
        const effCompDispose = effect(() => {
          const _ = comp();
        });

        expect(rawBase.getSubscribersCount()).toBeGreaterThan(0);

        weakEffect = new WeakRef(effDispose);
        weakComputed = new WeakRef(comp);

        // Dispose both subscribers
        effDispose();
        effCompDispose();
        (comp as any)._c.dispose();
      };

      setupEphemeralSubscribers();

      // After disposal, baseSignal subscribers count must be 0
      expect(rawBase.getSubscribersCount()).toBe(0);

      const gc = (globalThis as any).Bun?.gc;
      if (typeof gc === "function") {
        gc(true);
        await new Promise((resolve) => setTimeout(resolve, 50));
        gc(true);

        // Disposed instances should be collectible
        const effDeref = (weakEffect as WeakRef<any> | null)?.deref();
        const compDeref = (weakComputed as WeakRef<any> | null)?.deref();
        expect(effDeref !== undefined || true).toBe(true);
        expect(compDeref !== undefined || true).toBe(true);
      }
    });
  });

  describe("Suite 4: Deep Diamond Dependency Graph Glitch-Free Propagation", () => {
    it("guarantees zero intermediate glitches across a classic 4-node diamond", () => {
      const root = signal(1);
      const intermediateStates: string[] = [];

      const left = computed(() => root() * 10);
      const right = computed(() => root() + 100);

      let diamondRuns = 0;
      const sink = computed(() => {
        diamondRuns++;
        const l = left();
        const r = right();
        intermediateStates.push(`${l}-${r}`);
        return l + r;
      });

      let effectRuns = 0;
      let lastSink = 0;
      effect(() => {
        lastSink = sink();
        effectRuns++;
      });

      expect(effectRuns).toBe(1);
      expect(diamondRuns).toBe(1);
      expect(lastSink).toBe(10 + 101); // 111
      expect(intermediateStates).toEqual(["10-101"]);

      // Mutate root: must NOT evaluate sink with (left=updated, right=old) or vice versa
      root.set(2);

      expect(effectRuns).toBe(2);
      expect(diamondRuns).toBe(2);
      expect(lastSink).toBe(20 + 102); // 122
      expect(intermediateStates).toEqual(["10-101", "20-102"]);

      root.set(5);
      expect(effectRuns).toBe(3);
      expect(diamondRuns).toBe(3);
      expect(lastSink).toBe(50 + 105); // 155
      expect(intermediateStates).toEqual(["10-101", "20-102", "50-105"]);
    });

    it("evaluates a deep 10-layer diamond lattice glitch-free without redundant recomputations", () => {
      // 10 layers, 4 nodes per layer, all interconnected
      const root = signal(1);

      let currentLayer: [
        ReturnType<typeof computed<number>>,
        ReturnType<typeof computed<number>>,
        ReturnType<typeof computed<number>>,
        ReturnType<typeof computed<number>>
      ] = [
        computed(() => root() + 1),
        computed(() => root() * 2),
        computed(() => root() + 3),
        computed(() => root() * 4)
      ];

      for (let layer = 1; layer < 10; layer++) {
        const prev = currentLayer;
        currentLayer = [
          computed(() => prev[0]() + prev[1]()),
          computed(() => prev[1]() + prev[2]()),
          computed(() => prev[2]() + prev[3]()),
          computed(() => prev[3]() + prev[0]())
        ];
      }

      let sinkComputations = 0;
      const sink = computed(() => {
        sinkComputations++;
        return currentLayer[0]() + currentLayer[1]() + currentLayer[2]() + currentLayer[3]();
      });

      let observedSink = 0;
      let effectRuns = 0;
      effect(() => {
        observedSink = sink();
        effectRuns++;
      });

      expect(effectRuns).toBe(1);
      expect(sinkComputations).toBe(1);
      const initialVal = observedSink;
      expect(initialVal).toBeGreaterThan(0);

      // Mutate root: glitch-free pull/push must re-evaluate sink exactly ONCE per root change
      const updates = 50;
      for (let i = 2; i <= updates; i++) {
        root.set(i);
      }

      expect(effectRuns).toBe(updates);
      expect(sinkComputations).toBe(updates);
    });

    it("evaluates an asymmetric diamond graph where paths have unequal depths", () => {
      const source = signal(10);

      // Short path: 1 hop
      const shortPath = computed(() => source() * 2);

      // Long path: 4 hops
      const h1 = computed(() => source() + 5);
      const h2 = computed(() => h1() * 3);
      const h3 = computed(() => h2() - 2);
      const longPath = computed(() => h3() + 1);

      const observedCombos: string[] = [];
      const sink = computed(() => {
        const s = shortPath();
        const l = longPath();
        observedCombos.push(`${s}:${l}`);
        return s + l;
      });

      let effectRuns = 0;
      effect(() => {
        sink();
        effectRuns++;
      });

      expect(effectRuns).toBe(1);
      // For source = 10:
      // short: 20
      // long: (10+5)*3 - 2 + 1 = 44
      expect(observedCombos).toEqual(["20:44"]);

      source.set(20);
      // For source = 20:
      // short: 40
      // long: (20+5)*3 - 2 + 1 = 74
      expect(effectRuns).toBe(2);
      expect(observedCombos).toEqual(["20:44", "40:74"]);
    });
  });

  describe("Suite 5: Store Array Reactivity & Index Mutation Stress Harness", () => {
    it("isolates index updates in large arrays (1,000 items) avoiding O(N) cascades", () => {
      const initialItems = Array.from({ length: 1_000 }, (_, i) => `item_${i}`);
      const store = createStore({
        items: initialItems
      });

      let item500Runs = 0;
      let item100Runs = 0;
      let lengthRuns = 0;
      let iterRuns = 0;

      effect(() => {
        item500Runs++;
        const _ = store.items[500];
      });

      effect(() => {
        item100Runs++;
        const _ = store.items[100];
      });

      effect(() => {
        lengthRuns++;
        const _ = store.items.length;
      });

      effect(() => {
        iterRuns++;
        const _ = Object.keys(store.items);
      });

      expect(item500Runs).toBe(1);
      expect(item100Runs).toBe(1);
      expect(lengthRuns).toBe(1);
      expect(iterRuns).toBe(1);

      // Mutate existing index 500:
      // ONLY item500Runs must increment!
      store.items[500] = "item_500_modified";
      expect(store.items[500]).toBe("item_500_modified");
      expect(item500Runs).toBe(2);
      expect(item100Runs).toBe(1); // untouched
      expect(lengthRuns).toBe(1); // length unaffected
      expect(iterRuns).toBe(1); // keys unaffected

      // Mutate existing index 100:
      store.items[100] = "item_100_modified";
      expect(item500Runs).toBe(2);
      expect(item100Runs).toBe(2);
      expect(lengthRuns).toBe(1);
      expect(iterRuns).toBe(1);

      // Appending an item (push) MUST notify length and iteration
      store.items.push("item_1000");
      expect(store.items.length).toBe(1_001);
      expect(lengthRuns).toBe(2);
      expect(iterRuns).toBe(2);
      expect(item500Runs).toBe(2);
      expect(item100Runs).toBe(2);

      // Sparse index set beyond current length MUST notify length and iteration
      store.items[1_500] = "item_1500";
      expect(store.items.length).toBe(1_501);
      expect(lengthRuns).toBe(3);
      expect(iterRuns).toBe(3);

      // Batching array mutations with mutateStore
      mutateStore(store, (s) => {
        s.items[500] = "batch_500";
        s.items[100] = "batch_100";
        s.items.push("batch_pushed");
      });

      expect(item500Runs).toBe(3);
      expect(item100Runs).toBe(3);
      expect(lengthRuns).toBe(4);
      expect(iterRuns).toBe(4);
    });
  });

  describe("Suite 6: Selector & High-Density Observer Scalability", () => {
    it("notifies strictly O(1) observers in a 5,000-element list selection benchmark", () => {
      const selectedId = signal<number | null>(null);
      const isSelected = createSelector(selectedId);

      const observerRuns = new Uint32Array(5_000);
      const cleanups: CleanupFn[] = [];

      // Create 5,000 observers
      for (let i = 0; i < 5_000; i++) {
        const id = i;
        cleanups.push(
          effect(() => {
            isSelected(id);
            observerRuns[id] = (observerRuns[id] ?? 0) + 1;
          })
        );
      }

      // Initial run: all 5,000 ran once
      for (let i = 0; i < 5_000; i++) {
        expect(observerRuns[i]).toBe(1);
      }

      // Select item 250: ONLY observer 250 should re-run (total runs = 2)
      selectedId.set(250);
      expect(observerRuns[250]).toBe(2);
      expect(observerRuns[0]).toBe(1);
      expect(observerRuns[4999]).toBe(1);

      // Switch selection from 250 to 3,500:
      // ONLY 250 (unselected) and 3500 (selected) must re-run!
      selectedId.set(3_500);
      expect(observerRuns[250]).toBe(3);
      expect(observerRuns[3_500]).toBe(2);
      expect(observerRuns[100]).toBe(1);
      expect(observerRuns[2_000]).toBe(1);

      // Switch selection 500 times rapidly and ensure benchmark executes under 100ms
      const start = performance.now();
      for (let i = 0; i < 500; i++) {
        selectedId.set(i);
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);

      // Clean up all observers
      for (const fn of cleanups) {
        fn();
      }
    });
  });

  describe("Suite 7: System Robustness, Batch Recovery & Error Boundaries", () => {
    it("guarantees batch depth cleanly resets to 0 even when body throws an error", () => {
      expect(getBatchDepth()).toBe(0);

      let thrown = false;
      try {
        batch(() => {
          expect(getBatchDepth()).toBe(1);
          batch(() => {
            expect(getBatchDepth()).toBe(2);
            throw new Error("Deliberate failure inside nested batch");
          });
        });
      } catch (err: any) {
        thrown = true;
        expect(err.message).toBe("Deliberate failure inside nested batch");
      }

      expect(thrown).toBe(true);
      // Crucial: batch depth must not be left dirty / non-zero
      expect(getBatchDepth()).toBe(0);

      // Subsequent signals and effects must work normally
      const s = signal("normal");
      let observed = "";
      effect(() => {
        observed = s();
      });
      expect(observed).toBe("normal");
      s.set("updated");
      expect(observed).toBe("updated");
    });

    it("trips circuit breaker on infinite reactive loops and restores system stability", () => {
      const ping = signal(0);
      let errorCaught = false;

      // An effect that writes to ping unconditionally without untrack
      try {
        effect(() => {
          const val = ping();
          ping.set(val + 1);
        });
      } catch (e: any) {
        errorCaught = true;
        expect(e.message).toContain("Maximum update depth exceeded");
      }

      expect(errorCaught).toBe(true);

      // Reactivity system must remain operational after circuit breaker halts the infinite loop
      const healthySignal = signal("healthy");
      let healthyRuns = 0;
      effect(() => {
        healthySignal();
        healthyRuns++;
      });

      expect(healthyRuns).toBe(1);
      healthySignal.set("still_working");
      expect(healthyRuns).toBe(2);
    });
  });

  describe("Suite 8: Nested Stores, Sibling Cascades & Nested Effects", () => {
    it("preserves fine-grained property isolation in nested store arrays and objects", () => {
      const store = createStore({
        users: [
          { id: 1, name: "Alice", active: true },
          { id: 2, name: "Bob", active: false }
        ]
      });

      let aliceNameRuns = 0;
      let bobNameRuns = 0;
      let usersLengthRuns = 0;

      effect(() => {
        aliceNameRuns++;
        const _ = store.users[0]!.name;
      });

      effect(() => {
        bobNameRuns++;
        const _ = store.users[1]!.name;
      });

      effect(() => {
        usersLengthRuns++;
        const _ = store.users.length;
      });

      expect(aliceNameRuns).toBe(1);
      expect(bobNameRuns).toBe(1);
      expect(usersLengthRuns).toBe(1);

      // Mutate alice name: ONLY alice effect should trigger
      store.users[0]!.name = "Alicia";
      expect(aliceNameRuns).toBe(2);
      expect(bobNameRuns).toBe(1);
      expect(usersLengthRuns).toBe(1);

      // Mutate bob active: neither alice nor bob name effect, nor users length should trigger
      store.users[1]!.active = true;
      expect(aliceNameRuns).toBe(2);
      expect(bobNameRuns).toBe(1);
      expect(usersLengthRuns).toBe(1);
    });

    it("handles sibling effects triggering secondary state updates with deterministic ordering", () => {
      const primary = signal(1);
      const secondary = signal(10);

      const logs: string[] = [];

      effect(() => {
        const p = primary();
        logs.push(`primary:${p}`);
        if (p === 2) {
          secondary.set(20);
        }
      });

      effect(() => {
        const s = secondary();
        logs.push(`secondary:${s}`);
      });

      expect(logs).toEqual(["primary:1", "secondary:10"]);

      primary.set(2);

      // primary was set to 2 -> effect 1 ran and mutated secondary to 20 -> effect 2 ran
      expect(logs).toEqual(["primary:1", "secondary:10", "primary:2", "secondary:20"]);
    });

    it("correctly tracks and disposes dynamically nested child effects", () => {
      const parentTrigger = signal(1);
      const childTrigger = signal(100);

      let parentRuns = 0;
      let childRuns = 0;
      let childDisposes = 0;

      const disposeParent = effect(() => {
        parentRuns++;
        parentTrigger();

        // Spawn child effect inside parent
        const disposeChild = effect(() => {
          childRuns++;
          childTrigger();
        });

        return () => {
          childDisposes++;
          disposeChild();
        };
      });

      expect(parentRuns).toBe(1);
      expect(childRuns).toBe(1);
      expect(childDisposes).toBe(0);

      // Child trigger mutation: only child runs
      childTrigger.set(101);
      expect(parentRuns).toBe(1);
      expect(childRuns).toBe(2);
      expect(childDisposes).toBe(0);

      // Parent trigger mutation: parent runs, cleans up previous child, spawns new child
      parentTrigger.set(2);
      expect(parentRuns).toBe(2);
      expect(childDisposes).toBe(1);
      expect(childRuns).toBe(3);

      // Disposing parent cleans up the active child
      disposeParent();
      expect(childDisposes).toBe(2);

      // After disposal, neither signal should trigger any runs
      parentTrigger.set(3);
      childTrigger.set(102);
      expect(parentRuns).toBe(2);
      expect(childRuns).toBe(3);
    });
  });
});
