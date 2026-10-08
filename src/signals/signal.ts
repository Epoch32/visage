/**
 * Visage Fine-Grained Reactive Engine (Zero-VDOM, Push-Pull, Glitch-Free)
 */

export type CleanupFn = () => void;
export type Subscriber = Effect | Computed<any>;
export type Dependency = Signal<any> | Computed<any>;

// State flags for subscriber status
export enum SubscriberState {
  CLEAN = 0,
  CHECK_DIRTY = 1,
  DIRTY = 2,
  DISPOSED = 3
}

// Current active subscriber in execution stack
let currentSubscriber: Subscriber | null = null;
let currentScope: Scope | null = null;
let batchDepth = 0;
const pendingEffects: Set<Effect> = new Set();
let isFlushing = false;

export const SIGNAL_BRAND = Symbol("visage.signal");
export const COMPUTED_BRAND = Symbol("visage.computed");

export interface ReadonlySignal<T> {
  get(): T;
  readonly value: T;
  (): T;
  readonly [SIGNAL_BRAND]: true;
}

export interface WritableSignal<T> extends ReadonlySignal<T> {
  set(value: T): void;
  update(fn: (prev: T) => T): void;
  (value?: T): T;
  value: T;
}

/**
 * Check if a value is a Visage signal or computed
 */
export function isSignal<T = unknown>(value: unknown): value is ReadonlySignal<T> {
  return typeof value === "function" && (SIGNAL_BRAND in value || COMPUTED_BRAND in value);
}

/**
 * Reactive Scope for lifecycle and automatic memory management
 */
export class Scope {
  subscribers = new Set<Subscriber>();
  cleanups: CleanupFn[] = [];
  parent: Scope | null = null;
  isDisposed = false;

  constructor(parent: Scope | null = currentScope) {
    this.parent = parent;
    if (parent && !parent.isDisposed) {
      parent.cleanups.push(() => this.dispose());
    }
  }

  addSubscriber(sub: Subscriber) {
    if (this.isDisposed) return;
    this.subscribers.add(sub);
  }

  addCleanup(fn: CleanupFn) {
    if (this.isDisposed) {
      fn();
      return;
    }
    this.cleanups.push(fn);
  }

  dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;
    for (const sub of this.subscribers) {
      sub.dispose();
    }
    this.subscribers.clear();

    for (let i = this.cleanups.length - 1; i >= 0; i--) {
      try {
        this.cleanups[i]!();
      } catch (err) {
        console.error("Error during cleanup:", err);
      }
    }
    this.cleanups = [];
  }
}

/**
 * Register a cleanup callback for the current running effect or active scope
 */
export function onCleanup(fn: CleanupFn): void {
  if (currentSubscriber && currentSubscriber instanceof Effect) {
    currentSubscriber.addCleanup(fn);
  } else if (currentScope) {
    currentScope.addCleanup(fn);
  }
}

/**
 * Create an isolated reactive root scope
 */
export function createRoot<T>(fn: (dispose: () => void) => T): T {
  const prevScope = currentScope;
  const scope = new Scope(null);
  currentScope = scope;
  try {
    return fn(() => scope.dispose());
  } finally {
    currentScope = prevScope;
  }
}

/**
 * Run a function with a specified scope active
 */
export function runInScope<T>(scope: Scope | null, fn: () => T): T {
  const prevScope = currentScope;
  currentScope = scope;
  try {
    return fn();
  } finally {
    currentScope = prevScope;
  }
}

/**
 * Get the currently active scope
 */
export function getActiveScope(): Scope | null {
  return currentScope;
}

/**
 * Core Writable Signal implementation
 */
export class Signal<T> {
  [SIGNAL_BRAND] = true as const;
  private _value: T;
  private _subscribers: Set<Subscriber> = new Set();
  private _equals: (a: T, b: T) => boolean;
  version = 0;

  constructor(initialValue: T, equals?: (a: T, b: T) => boolean) {
    this._value = initialValue;
    this._equals = equals ?? Object.is;
  }

  get(): T {
    if (currentSubscriber !== null && currentSubscriber.state !== SubscriberState.DISPOSED) {
      this._subscribers.add(currentSubscriber);
      currentSubscriber.sources.add(this);
      currentSubscriber.sourceVersions.set(this, this.version);
    }
    return this._value;
  }

  set(newValue: T): void {
    if (this._equals(this._value, newValue)) {
      return;
    }
    this._value = newValue;
    this.version++;
    batch(() => {
      this.notify();
    });
  }

  update(fn: (prev: T) => T): void {
    this.set(fn(this._value));
  }

  get value(): T {
    return this.get();
  }

  set value(val: T) {
    this.set(val);
  }

  removeSubscriber(sub: Subscriber) {
    this._subscribers.delete(sub);
  }

  private notify(): void {
    if (this._subscribers.size === 0) return;

    const subs = Array.from(this._subscribers);
    for (const sub of subs) {
      sub.markDirty(SubscriberState.DIRTY);
    }
  }
}

export interface SignalOptions<T> {
  name?: string;
  equals?: (a: T, b: T) => boolean;
  internal?: boolean;
}

export interface ComputedOptions {
  name?: string;
  internal?: boolean;
}

/**
 * Factory for creating writable signals
 */
export function signal<T>(
  initialValue: T,
  optionsOrEquals?: ((a: T, b: T) => boolean) | SignalOptions<T>
): WritableSignal<T> {
  const equals = typeof optionsOrEquals === "function" ? optionsOrEquals : optionsOrEquals?.equals;
  const isInternal = typeof optionsOrEquals === "object" ? optionsOrEquals?.internal : false;
  const customName = typeof optionsOrEquals === "object" ? optionsOrEquals?.name : undefined;

  const s = new Signal(initialValue, equals);

  const accessor = ((...args: [value?: T]): T => {
    if (args.length === 0) {
      return s.get();
    }
    s.set(args[0] as T);
    return args[0] as T;
  }) as WritableSignal<T>;

  Object.defineProperties(accessor, {
    [SIGNAL_BRAND]: { value: true },
    get: { value: () => s.get() },
    set: { value: (v: T) => s.set(v) },
    update: { value: (fn: (prev: T) => T) => s.update(fn) },
    value: {
      get: () => s.get(),
      set: (v: T) => s.set(v)
    }
  });

  if (!isInternal && typeof window !== "undefined" && (window as any).__VISAGE_DEVTOOLS__) {
    const devtools = (window as any).__VISAGE_DEVTOOLS__;
    const sigId = devtools.registerSignal({
      name: customName,
      type: "signal",
      getValue: () => s.get(),
      version: () => s.version
    });
    if (currentScope) {
      currentScope.addCleanup(() => {
        devtools.unregisterSignal(sigId);
      });
    }
  }

  return accessor;
}

/**
 * Computed / Derived reactive state (Lazy, Glitch-Free, Memoized)
 */
export class Computed<T> {
  [COMPUTED_BRAND] = true as const;
  private _fn: () => T;
  private _value!: T;
  private _subscribers: Set<Subscriber> = new Set();
  sources: Set<Dependency> = new Set();
  sourceVersions: Map<Dependency, number> = new Map();
  state: SubscriberState = SubscriberState.DIRTY;
  scope: Scope | null;
  version = 0;

  constructor(fn: () => T) {
    this._fn = fn;
    this.scope = currentScope;
    if (currentScope) {
      currentScope.addSubscriber(this);
    }
  }

  get(): T {
    if (this.state === SubscriberState.DISPOSED) {
      return this._fn();
    }

    if (currentSubscriber !== null && currentSubscriber.state !== SubscriberState.DISPOSED) {
      this._subscribers.add(currentSubscriber);
      currentSubscriber.sources.add(this);
      currentSubscriber.sourceVersions.set(this, this.version);
    }

    if (this.state === SubscriberState.DIRTY || this.state === SubscriberState.CHECK_DIRTY) {
      this.updateIfNecessary();
    }

    return this._value;
  }

  get value(): T {
    return this.get();
  }

  removeSubscriber(sub: Subscriber) {
    this._subscribers.delete(sub);
  }

  markDirty(targetState: SubscriberState = SubscriberState.CHECK_DIRTY): void {
    if (this.state >= targetState || this.state === SubscriberState.DISPOSED) {
      return;
    }
    this.state = targetState;

    for (const sub of this._subscribers) {
      sub.markDirty(SubscriberState.CHECK_DIRTY);
    }
  }

  updateIfNecessary(): boolean {
    if (this.state === SubscriberState.DIRTY) {
      const prev = this._value;
      this.recompute();
      return !Object.is(prev, this._value);
    }

    if (this.state === SubscriberState.CHECK_DIRTY) {
      let anyChanged = false;
      for (const source of this.sources) {
        if (source instanceof Computed) {
          source.updateIfNecessary();
        }
        const lastVersion = this.sourceVersions.get(source);
        if (lastVersion !== undefined && lastVersion !== source.version) {
          anyChanged = true;
        }
      }

      if (anyChanged) {
        const prev = this._value;
        this.recompute();
        return !Object.is(prev, this._value);
      }

      this.state = SubscriberState.CLEAN;
      return false;
    }

    return false;
  }

  private recompute(): void {
    this.cleanupSources();

    const prevSubscriber = currentSubscriber;
    currentSubscriber = this;
    const prevScope = currentScope;
    currentScope = this.scope;

    try {
      const next = this._fn();
      if (!Object.is(this._value, next)) {
        this._value = next;
        this.version++;
      }
      this.state = SubscriberState.CLEAN;
    } finally {
      currentSubscriber = prevSubscriber;
      currentScope = prevScope;
    }
  }

  private cleanupSources(): void {
    for (const source of this.sources) {
      source.removeSubscriber(this);
    }
    this.sources.clear();
    this.sourceVersions.clear();
  }

  dispose(): void {
    if (this.state === SubscriberState.DISPOSED) return;
    this.state = SubscriberState.DISPOSED;
    this.cleanupSources();
    this._subscribers.clear();
  }
}

/**
 * Factory for creating computed signals
 */
export function computed<T>(fn: () => T, options?: ComputedOptions): ReadonlySignal<T> {
  const isInternal = options?.internal ?? false;
  const customName = options?.name;

  const c = new Computed(fn);

  const accessor = ((): T => c.get()) as ReadonlySignal<T>;

  Object.defineProperties(accessor, {
    [COMPUTED_BRAND]: { value: true },
    get: { value: () => c.get() },
    value: { get: () => c.get() }
  });

  if (!isInternal && typeof window !== "undefined" && (window as any).__VISAGE_DEVTOOLS__) {
    const devtools = (window as any).__VISAGE_DEVTOOLS__;
    const sigId = devtools.registerSignal({
      name: customName,
      type: "computed",
      getValue: () => c.get(),
      version: () => c.version
    });
    if (currentScope) {
      currentScope.addCleanup(() => {
        devtools.unregisterSignal(sigId);
      });
    }
  }

  return accessor;
}

/**
 * Side-effect runner with automatic dependency tracking and disposal
 */
export class Effect {
  private _fn: () => void | CleanupFn;
  sources: Set<Dependency> = new Set();
  sourceVersions: Map<Dependency, number> = new Map();
  cleanups: CleanupFn[] = [];
  state: SubscriberState = SubscriberState.DIRTY;
  scope: Scope | null;

  constructor(fn: () => void | CleanupFn) {
    this._fn = fn;
    this.scope = currentScope;
    if (currentScope) {
      currentScope.addSubscriber(this);
    }
    this.run();
  }

  addCleanup(fn: CleanupFn) {
    this.cleanups.push(fn);
  }

  private runCleanups() {
    for (let i = this.cleanups.length - 1; i >= 0; i--) {
      try {
        this.cleanups[i]!();
      } catch (e) {
        console.error("Error in effect cleanup:", e);
      }
    }
    this.cleanups = [];
  }

  markDirty(targetState: SubscriberState = SubscriberState.DIRTY): void {
    if (this.state >= targetState || this.state === SubscriberState.DISPOSED) {
      return;
    }
    this.state = targetState;
    pendingEffects.add(this);

    if (batchDepth === 0) {
      flushEffects();
    }
  }

  run(): void {
    if (this.state === SubscriberState.DISPOSED) return;

    if (this.state === SubscriberState.CHECK_DIRTY) {
      let isDirty = false;
      for (const source of this.sources) {
        if (source instanceof Computed) {
          source.updateIfNecessary();
        }
        const lastVersion = this.sourceVersions.get(source);
        if (lastVersion !== undefined && lastVersion !== source.version) {
          isDirty = true;
        }
      }
      if (!isDirty) {
        this.state = SubscriberState.CLEAN;
        return;
      }
    }

    this.runCleanups();
    this.cleanupSources();

    const prevSubscriber = currentSubscriber;
    currentSubscriber = this;
    const prevScope = currentScope;
    currentScope = this.scope;

    try {
      this.state = SubscriberState.CLEAN;
      const res = this._fn();
      if (typeof res === "function") {
        this.cleanups.push(res);
      }
    } finally {
      currentSubscriber = prevSubscriber;
      currentScope = prevScope;
    }
  }

  private cleanupSources(): void {
    for (const source of this.sources) {
      source.removeSubscriber(this);
    }
    this.sources.clear();
    this.sourceVersions.clear();
  }

  dispose(): void {
    if (this.state === SubscriberState.DISPOSED) return;
    this.state = SubscriberState.DISPOSED;
    this.runCleanups();
    this.cleanupSources();
    pendingEffects.delete(this);
  }
}

function flushEffects() {
  if (isFlushing || batchDepth > 0) return;
  isFlushing = true;
  try {
    while (pendingEffects.size > 0) {
      const effectsToRun = Array.from(pendingEffects);
      pendingEffects.clear();

      for (const eff of effectsToRun) {
        if (eff.state === SubscriberState.DIRTY || eff.state === SubscriberState.CHECK_DIRTY) {
          eff.run();
        }
      }
    }
  } finally {
    isFlushing = false;
  }
}

/**
 * Execute side-effects reactively when dependencies change
 */
export function effect(fn: () => void | CleanupFn): CleanupFn {
  const eff = new Effect(fn);
  return () => eff.dispose();
}

/**
 * Batch multiple signal mutations so downstreams update synchronously once at completion
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushEffects();
    }
  }
}

/**
 * Read reactive state without subscribing current effect or computed
 */
export function untrack<T>(fn: () => T): T {
  const prev = currentSubscriber;
  currentSubscriber = null;
  try {
    return fn();
  } finally {
    currentSubscriber = prev;
  }
}
