/**
 * Visage Fine-Grained Reactive Engine Type Definitions
 */

export type CleanupFn = () => void;

// State flags for subscriber status
export enum SubscriberState {
  CLEAN = 0,
  CHECK_DIRTY = 1,
  DIRTY = 2,
  DISPOSED = 3
}

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

export interface PersistOptions<T> {
  key: string;
  storage?: "local" | "session" | Storage;
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
  syncTabs?: boolean;
}

export interface SignalOptions<T> {
  name?: string;
  equals?: (a: T, b: T) => boolean;
  internal?: boolean;
  persist?: string | PersistOptions<T>;
}

export interface ComputedOptions {
  name?: string;
  internal?: boolean;
}

/**
 * Check if a value is a Visage signal or computed
 */
export function isSignal<T = unknown>(value: unknown): value is ReadonlySignal<T> {
  return typeof value === "function" && (SIGNAL_BRAND in value || COMPUTED_BRAND in value);
}

export interface ISubscriber {
  state: SubscriberState;
  sources: Set<IDependency>;
  sourceVersions: Map<IDependency, number>;
  markDirty(targetState?: SubscriberState): void;
  dispose(): void;
}

export interface IDependency {
  version: number;
  removeSubscriber(sub: ISubscriber): void;
}

export type Subscriber = ISubscriber;
export type Dependency = IDependency;
