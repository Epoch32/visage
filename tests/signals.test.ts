import { describe, expect, it } from "bun:test";
import {
  batch,
  computed,
  createContext,
  createRoot,
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
});
