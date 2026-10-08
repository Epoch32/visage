import { Signal, batch, isSignal } from "./signal";

const STORE_RAW = Symbol("visage.store.raw");
const STORE_SIGNALS = Symbol("visage.store.signals");
const STORE_PROXY = Symbol("visage.store.proxy");

export type Store<T> = T;

function isObject(val: unknown): val is Record<string | symbol, any> {
  return (
    typeof val === "object" &&
    val !== null &&
    (typeof Node === "undefined" || !(val instanceof Node)) &&
    !isSignal(val)
  );
}

function getOrCreatePropertySignal(target: any, prop: string | symbol): Signal<any> {
  let signalsMap: Map<string | symbol, Signal<any>> = target[STORE_SIGNALS];
  if (!signalsMap) {
    signalsMap = new Map();
    Object.defineProperty(target, STORE_SIGNALS, {
      value: signalsMap,
      enumerable: false,
      writable: true
    });
  }

  let sig = signalsMap.get(prop);
  if (!sig) {
    sig = new Signal(target[prop]);
    signalsMap.set(prop, sig);
  }
  return sig;
}

function createStoreProxy<T extends object>(target: T): T {
  if (!isObject(target)) return target;
  if ((target as any)[STORE_PROXY]) return (target as any)[STORE_PROXY];

  const proxy = new Proxy(target, {
    get(target, prop, receiver) {
      if (prop === STORE_RAW) return target;
      if (prop === STORE_PROXY) return proxy;

      // Track property access
      if (typeof prop === "string" || typeof prop === "symbol") {
        const sig = getOrCreatePropertySignal(target, prop);
        sig.get(); // Register dependency
      }

      const value = Reflect.get(target, prop, receiver);

      // Lazily wrap nested objects in proxy
      if (isObject(value)) {
        return createStoreProxy(value);
      }

      return value;
    },

    set(target, prop, value, receiver) {
      const prevValue = Reflect.get(target, prop, receiver);
      if (Object.is(prevValue, value)) {
        return true;
      }

      const success = Reflect.set(target, prop, value, receiver);
      if (success) {
        const sig = getOrCreatePropertySignal(target, prop);
        sig.set(value);

        // If array length or property keys changed, notify length/keys
        if (Array.isArray(target) && prop !== "length") {
          const lenSig = getOrCreatePropertySignal(target, "length");
          lenSig.set(target.length);
        }
      }
      return success;
    },

    deleteProperty(target, prop) {
      const hadProp = Reflect.has(target, prop);
      const success = Reflect.deleteProperty(target, prop);
      if (hadProp && success) {
        const sig = getOrCreatePropertySignal(target, prop);
        sig.set(undefined);
      }
      return success;
    }
  });

  Object.defineProperty(target, STORE_PROXY, {
    value: proxy,
    enumerable: false,
    writable: true
  });

  return proxy;
}

/**
 * Create a deep reactive proxy store with per-property fine-grained signal tracking
 */
export function createStore<T extends object>(initialState: T): Store<T> {
  if (!isObject(initialState)) {
    throw new Error("createStore requires an object or array as initial state");
  }
  return createStoreProxy(initialState);
}

/**
 * Mutate a store inside a batch operation
 */
export function mutateStore<T extends object>(store: Store<T>, mutator: (draft: T) => void): void {
  batch(() => {
    mutator(store);
  });
}

/**
 * Unwrap a reactive proxy store to get raw object
 */
export function unwrapStore<T>(store: T): T {
  if (isObject(store) && (store as any)[STORE_RAW]) {
    return (store as any)[STORE_RAW];
  }
  return store;
}
