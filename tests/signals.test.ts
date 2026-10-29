import { describe, expect, it } from "bun:test";
import {
  batch,
  computed,
  createContext,
  createRoot,
  createSelector,
  createSignal,
  createStore,
  effect,
  mutateStore,
  onCleanup,
  signal,
  untrack,
  useContext
} from "../src/signals";

describe("Visage Signals", () => {
  it("creates writable signals and reads/writes values", () => {
    const count = signal(0);
    expect(count()).toBe(0);
    expect(count.value).toBe(0);
    expect(count.get()).toBe(0);

    count.set(5);
    expect(count()).toBe(5);

    count.update((n) => n + 1);
    expect(count()).toBe(6);

    count(10);
    expect(count()).toBe(10);
  });

  it("computes derived state lazily and memoizes values", () => {
    const count = signal(2);
    let computeRuns = 0;

    const doubled = computed(() => {
      computeRuns++;
      return count() * 2;
    });

    expect(computeRuns).toBe(0); // Lazy: not evaluated until read
    expect(doubled()).toBe(4);
    expect(computeRuns).toBe(1);

    expect(doubled()).toBe(4);
    expect(computeRuns).toBe(1); // Memoized: not recomputed

    count.set(5);
    expect(doubled()).toBe(10);
    expect(computeRuns).toBe(2);
  });

  it("solves diamond dependency glitch-free", () => {
    const a = signal(1);
    const b = computed(() => a() * 2);
    const c = computed(() => a() + 10);
    const d = computed(() => `${b()}-${c()}`);

    const history: string[] = [];
    effect(() => {
      history.push(d());
    });

    expect(history).toEqual(["2-11"]);

    a.set(2);
    expect(history).toEqual(["2-11", "4-12"]);
  });

  it("handles 0, 1, 2, and 3+ sources/subscribers with inline slot promotion", () => {
    const s1 = signal(1);
    const s2 = signal(10);
    const s3 = signal(100);
    const s4 = signal(1000);

    // 0 sources
    const c0 = computed(() => 42);
    expect(c0()).toBe(42);

    // 1 source
    const c1 = computed(() => s1() * 2);
    expect(c1()).toBe(2);

    // 2 sources
    const c2 = computed(() => s1() + s2());
    expect(c2()).toBe(11);

    // 3+ sources (promotes to Set/Map)
    const cMany = computed(() => s1() + s2() + s3() + s4());
    expect(cMany()).toBe(1111);

    // Verify updating sources
    s4.set(2000);
    expect(cMany()).toBe(2111);

    // Multiple subscribers (inline slots up to 2, then Set promotion)
    let e1Val = 0;
    let e2Val = 0;
    let e3Val = 0;
    let dispose1!: () => void;
    let dispose2!: () => void;
    let dispose3!: () => void;

    createRoot((d1) => {
      dispose1 = d1;
      effect(() => {
        e1Val = cMany();
      });
    });
    createRoot((d2) => {
      dispose2 = d2;
      effect(() => {
        e2Val = cMany();
      });
    });
    createRoot((d3) => {
      dispose3 = d3;
      effect(() => {
        e3Val = cMany();
      });
    });

    expect(e1Val).toBe(2111);
    expect(e2Val).toBe(2111);
    expect(e3Val).toBe(2111);

    s1.set(2);
    expect(e1Val).toBe(2112);
    expect(e2Val).toBe(2112);
    expect(e3Val).toBe(2112);

    // Test subscriber removal
    dispose3();
    s1.set(3);
    expect(e1Val).toBe(2113);
    expect(e2Val).toBe(2113);
    expect(e3Val).toBe(2112); // unchanged

    dispose2();
    s1.set(4);
    expect(e1Val).toBe(2114);
    expect(e2Val).toBe(2113);

    dispose1();
  });

  it("batches multiple signal updates", () => {
    const first = signal("John");
    const last = signal("Doe");
    let effectCount = 0;

    effect(() => {
      effectCount++;
      const _ = `${first()} ${last()}`;
    });

    expect(effectCount).toBe(1);

    batch(() => {
      first.set("Jane");
      last.set("Smith");
    });

    expect(effectCount).toBe(2);
  });

  it("untrack ignores signal dependencies", () => {
    const a = signal(1);
    const b = signal(10);
    let runs = 0;

    effect(() => {
      runs++;
      const _a = a();
      const _b = untrack(() => b());
    });

    expect(runs).toBe(1);

    b.set(20);
    expect(runs).toBe(1);

    a.set(2);
    expect(runs).toBe(2);
  });

  it("handles scopes and cleanup callbacks", () => {
    let cleanedUp = false;

    const dispose = createRoot((disposeScope) => {
      const count = signal(0);
      effect(() => {
        count();
        onCleanup(() => {
          cleanedUp = true;
        });
      });
      return disposeScope;
    });

    expect(cleanedUp).toBe(false);
    dispose();
    expect(cleanedUp).toBe(true);
  });

  it("tracks deep reactive proxy store mutations fine-grained", () => {
    const state = createStore({
      user: {
        name: "Alice",
        profile: { age: 30 }
      },
      list: [1, 2, 3]
    });

    let nameRuns = 0;
    let ageRuns = 0;

    effect(() => {
      nameRuns++;
      const _ = state.user.name;
    });

    effect(() => {
      ageRuns++;
      const _ = state.user.profile.age;
    });

    expect(nameRuns).toBe(1);
    expect(ageRuns).toBe(1);

    // Update name only: ageRuns must NOT re-run!
    state.user.name = "Bob";
    expect(nameRuns).toBe(2);
    expect(ageRuns).toBe(1);

    // Update age only: nameRuns must NOT re-run!
    mutateStore(state, (draft) => {
      draft.user.profile.age = 31;
    });
    expect(nameRuns).toBe(2);
    expect(ageRuns).toBe(2);
  });

  it("tracks store property existence ('in' operator) and key enumeration (Object.keys) reactively", () => {
    const store = createStore<Record<string, any>>({
      title: "Visage",
      version: "1.3.0"
    });

    let hasAdminRuns = 0;
    let isAdminPresent = false;
    effect(() => {
      hasAdminRuns++;
      isAdminPresent = "admin" in store;
    });

    let keysRuns = 0;
    let currentKeys: string[] = [];
    effect(() => {
      keysRuns++;
      currentKeys = Object.keys(store);
    });

    expect(hasAdminRuns).toBe(1);
    expect(isAdminPresent).toBe(false);
    expect(keysRuns).toBe(1);
    expect(currentKeys).toEqual(["title", "version"]);

    // Dynamically add a property
    store.admin = true;
    expect(hasAdminRuns).toBe(2);
    expect(isAdminPresent).toBe(true);
    expect(keysRuns).toBe(2);
    expect(currentKeys).toEqual(["title", "version", "admin"]);

    // Mutate existing property (should NOT trigger keysRuns or hasAdminRuns)
    store.title = "Visage Next";
    expect(hasAdminRuns).toBe(2);
    expect(keysRuns).toBe(2);

    // Delete property
    delete store.admin;
    expect(hasAdminRuns).toBe(3);
    expect(isAdminPresent).toBe(false);
    expect(keysRuns).toBe(3);
    expect(currentKeys).toEqual(["title", "version"]);
  });

  it("provides and consumes context across scopes", () => {
    const ThemeContext = createContext("light");
    let receivedTheme = "";

    createRoot(() => {
      ThemeContext.Provider({
        value: "dark",
        children: () => {
          receivedTheme = useContext(ThemeContext);
          return null;
        }
      });
    });

    expect(receivedTheme).toBe("dark");
  });

  it("detects cyclic signal updates and halts infinite loops with circuit breaker", () => {
    const count = signal(0);
    let warned = false;
    const origWarn = console.warn;
    console.warn = (...args: any[]) => {
      if (args[0]?.includes("Cyclic update detected")) {
        warned = true;
      }
    };

    try {
      expect(() => {
        effect(() => {
          count.set(count() + 1);
        });
      }).toThrow("Maximum update depth exceeded");
      expect(warned).toBe(true);
    } finally {
      console.warn = origWarn;
    }
  });

  describe("First-Class Signal Persistence", () => {
    it("persists signal values to storage and initializes from storage", () => {
      const mockStorage = new Map<string, string>();
      const fakeStorage: Storage = {
        getItem: (k: string) => mockStorage.get(k) ?? null,
        setItem: (k: string, v: string) => {
          mockStorage.set(k, v);
        },
        removeItem: (k: string) => {
          mockStorage.delete(k);
        },
        clear: () => {
          mockStorage.clear();
        },
        key: (_i: number) => null,
        length: 0
      };

      // 1. Initial state with no prior value
      const [theme, setTheme] = createSignal("light", {
        persist: {
          key: "app-theme",
          storage: fakeStorage
        }
      });
      expect(theme()).toBe("light");

      // 2. Set value, verify it is saved to storage
      setTheme("dark");
      expect(theme()).toBe("dark");
      expect(fakeStorage.getItem("app-theme")).toBe(JSON.stringify("dark"));

      // 3. New signal initialized with same key hydrates from storage
      const [hydratedTheme] = createSignal("system", {
        persist: {
          key: "app-theme",
          storage: fakeStorage
        }
      });
      expect(hydratedTheme()).toBe("dark");
    });

    it("supports shorthand persist: string key", () => {
      const mockStorage = new Map<string, string>();
      const origLocal = (globalThis as any).localStorage;
      const origWinLocal = typeof window !== "undefined" ? (window as any).localStorage : undefined;
      const fakeStorage = {
        getItem: (k: string) => mockStorage.get(k) ?? null,
        setItem: (k: string, v: string) => {
          mockStorage.set(k, v);
        },
        removeItem: (k: string) => {
          mockStorage.delete(k);
        },
        clear: () => {
          mockStorage.clear();
        },
        key: (_i: number) => null,
        length: 0
      };

      if (typeof window !== "undefined") {
        Object.defineProperty(window, "localStorage", {
          value: fakeStorage,
          configurable: true,
          writable: true
        });
      } else {
        (globalThis as any).localStorage = fakeStorage;
      }

      try {
        const pref = signal("system", { persist: "user-pref" });
        expect(pref()).toBe("system");

        pref("compact");
        expect(pref()).toBe("compact");
        expect(fakeStorage.getItem("user-pref")).toBe(JSON.stringify("compact"));

        const restored = signal("normal", { persist: "user-pref" });
        expect(restored()).toBe("compact");
      } finally {
        (globalThis as any).localStorage = origLocal;
        if (typeof window !== "undefined") {
          Object.defineProperty(window, "localStorage", {
            value: origWinLocal,
            configurable: true,
            writable: true
          });
        }
      }
    });

    it("supports custom serialize and deserialize handlers", () => {
      const mockStorage = new Map<string, string>();
      const fakeStorage: Storage = {
        getItem: (k: string) => mockStorage.get(k) ?? null,
        setItem: (k: string, v: string) => {
          mockStorage.set(k, v);
        },
        removeItem: (k: string) => {
          mockStorage.delete(k);
        },
        clear: () => {
          mockStorage.clear();
        },
        key: (_i: number) => null,
        length: 0
      };

      const [counter, setCounter] = createSignal(10, {
        persist: {
          key: "custom-count",
          storage: fakeStorage,
          serialize: (v) => `RAW:${v}`,
          deserialize: (r) => Number.parseInt(r.replace("RAW:", ""), 10)
        }
      });
      expect(counter()).toBe(10);

      setCounter(42);
      expect(fakeStorage.getItem("custom-count")).toBe("RAW:42");

      const [restored] = createSignal(0, {
        persist: {
          key: "custom-count",
          storage: fakeStorage,
          serialize: (v) => `RAW:${v}`,
          deserialize: (r) => Number.parseInt(r.replace("RAW:", ""), 10)
        }
      });
      expect(restored()).toBe(42);
    });

    it("falls back gracefully when storage contains corrupted data", () => {
      const fakeStorage: Storage = {
        getItem: () => "invalid-non-json{{{{",
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0
      };

      const [theme] = createSignal("light", {
        persist: {
          key: "corrupt-theme",
          storage: fakeStorage
        }
      });

      expect(theme()).toBe("light");
    });
  });

  describe("createSelector", () => {
    it("notifies only matching keys without waking up other observers", () => {
      const selected = signal<number | null>(null);
      const isSelected = createSelector(selected);

      let row1Runs = 0;
      let row2Runs = 0;
      let row3Runs = 0;
      let row1Val = false;
      let row2Val = false;
      let row3Val = false;

      effect(() => {
        row1Val = isSelected(1);
        row1Runs++;
      });
      effect(() => {
        row2Val = isSelected(2);
        row2Runs++;
      });
      effect(() => {
        row3Val = isSelected(3);
        row3Runs++;
      });

      // Initial run: all false
      expect(row1Runs).toBe(1);
      expect(row2Runs).toBe(1);
      expect(row3Runs).toBe(1);
      expect(row1Val).toBe(false);
      expect(row2Val).toBe(false);
      expect(row3Val).toBe(false);

      // Select row 2
      selected.set(2);
      expect(row1Runs).toBe(1); // row 1 was NOT notified
      expect(row2Runs).toBe(2); // row 2 became true
      expect(row3Runs).toBe(1); // row 3 was NOT notified
      expect(row1Val).toBe(false);
      expect(row2Val).toBe(true);
      expect(row3Val).toBe(false);

      // Switch to row 3: only row 2 (old) and row 3 (new) run!
      selected.set(3);
      expect(row1Runs).toBe(1); // row 1 still untouched
      expect(row2Runs).toBe(3); // row 2 became false
      expect(row3Runs).toBe(2); // row 3 became true
      expect(row1Val).toBe(false);
      expect(row2Val).toBe(false);
      expect(row3Val).toBe(true);

      // Deselect all
      selected.set(null);
      expect(row1Runs).toBe(1);
      expect(row2Runs).toBe(3);
      expect(row3Runs).toBe(3); // row 3 became false
      expect(row3Val).toBe(false);
    });

    it("supports custom equality functions", () => {
      const activeCategory = signal<{ id: string }>({ id: "tech" });
      const isCategoryActive = createSelector(
        activeCategory,
        (key: string, curr) => key === curr.id
      );

      let isTech = false;
      let isNews = false;
      let techRuns = 0;
      let newsRuns = 0;

      effect(() => {
        isTech = isCategoryActive("tech");
        techRuns++;
      });
      effect(() => {
        isNews = isCategoryActive("news");
        newsRuns++;
      });

      expect(isTech).toBe(true);
      expect(isNews).toBe(false);
      expect(techRuns).toBe(1);
      expect(newsRuns).toBe(1);

      activeCategory.set({ id: "news" });
      expect(isTech).toBe(false);
      expect(isNews).toBe(true);
      expect(techRuns).toBe(2);
      expect(newsRuns).toBe(2);
    });
  });

  describe("createStore - Array Reactivity & Mutation Optimization", () => {
    it("modifying existing array index updates element subscriber without triggering length or iteration effects", () => {
      const state = createStore({
        items: ["A", "B", "C"]
      });

      let item0Runs = 0;
      let item1Runs = 0;
      let lengthRuns = 0;
      let iterRuns = 0;

      effect(() => {
        item0Runs++;
        const _ = state.items[0];
      });

      effect(() => {
        item1Runs++;
        const _ = state.items[1];
      });

      effect(() => {
        lengthRuns++;
        const _ = state.items.length;
      });

      effect(() => {
        iterRuns++;
        const _ = Object.keys(state.items);
      });

      expect(item0Runs).toBe(1);
      expect(item1Runs).toBe(1);
      expect(lengthRuns).toBe(1);
      expect(iterRuns).toBe(1);

      // Mutate existing index 0: ONLY item0Runs should increment!
      // lengthRuns and iterRuns MUST NOT run (avoids O(N) cascade)
      state.items[0] = "Alpha";
      expect(state.items[0]).toBe("Alpha");
      expect(item0Runs).toBe(2);
      expect(item1Runs).toBe(1);
      expect(lengthRuns).toBe(1); // Length unchanged
      expect(iterRuns).toBe(1); // Iteration unchanged
    });

    it("adding new index beyond length triggers length and iteration subscribers", () => {
      const state = createStore({
        items: [1, 2, 3]
      });

      let lengthRuns = 0;
      let iterRuns = 0;

      effect(() => {
        lengthRuns++;
        const _ = state.items.length;
      });

      effect(() => {
        iterRuns++;
        const _ = Object.keys(state.items);
      });

      expect(lengthRuns).toBe(1);
      expect(iterRuns).toBe(1);

      // Add index 3
      state.items[3] = 4;
      expect(state.items.length).toBe(4);
      expect(lengthRuns).toBe(2);
      expect(iterRuns).toBe(2);
    });

    it("handles push, pop, shift, unshift, splice correctly with reactive length", () => {
      const state = createStore({
        items: [10, 20, 30]
      });

      let currentLength = 0;
      let lengthRuns = 0;

      effect(() => {
        lengthRuns++;
        currentLength = state.items.length;
      });

      expect(currentLength).toBe(3);
      expect(lengthRuns).toBe(1);

      // 1. push
      state.items.push(40);
      expect(currentLength).toBe(4);
      expect(lengthRuns).toBe(2);
      expect(state.items[3]).toBe(40);

      // 2. pop
      const popped = state.items.pop();
      expect(popped).toBe(40);
      expect(currentLength).toBe(3);
      expect(lengthRuns).toBe(3);

      // 3. shift
      const shifted = state.items.shift();
      expect(shifted).toBe(10);
      expect(currentLength).toBe(2);
      expect(lengthRuns).toBe(4);
      expect(state.items[0]).toBe(20);

      // 4. unshift
      state.items.unshift(5);
      expect(currentLength).toBe(3);
      expect(lengthRuns).toBe(5);
      expect(state.items[0]).toBe(5);

      // 5. splice
      state.items.splice(1, 1, 99);
      expect(currentLength).toBe(3);
      expect(state.items[1]).toBe(99);
    });

    it("batches array mutations inside mutateStore", () => {
      const state = createStore({
        items: [1, 2, 3]
      });

      let lengthRuns = 0;
      effect(() => {
        lengthRuns++;
        const _ = state.items.length;
      });

      expect(lengthRuns).toBe(1);

      mutateStore(state, (draft) => {
        draft.items.push(4);
        draft.items.push(5);
        draft.items.push(6);
      });

      expect(state.items.length).toBe(6);
      expect(lengthRuns).toBe(2); // Batched into 1 run
    });
  });
});
