import { describe, expect, it } from 'bun:test';
import { signal, batch } from '@epoch32/signal';
import { computed } from '@epoch32/compute';
import { effect, flushSync, isEffect, Signal } from '../src';

describe('EFFECT: Microtask Batch Scheduler & Lifecycle Teardowns', () => {
  it('executes immediately upon registration and tracks dependencies', () => {
    const count = signal(0);
    let observed = -1;

    const stop = effect(() => {
      observed = count();
    });

    expect(observed).toBe(0);
    stop();
  });

  it('coalesces multiple synchronous mutations into a single microtask execution', async () => {
    const a = signal(0);
    const b = signal(0);
    let runs = 0;
    let lastObserved = '';

    const stop = effect(() => {
      runs++;
      lastObserved = `${a()}-${b()}`;
    });

    expect(runs).toBe(1);
    expect(lastObserved).toBe('0-0');

    // 5 synchronous mutations across two signals
    a.set(1);
    b.set(10);
    a.set(2);
    b.set(20);
    a.set(3);

    // Synchronously, the effect has NOT re-run yet (preventing layout thrashing!)
    expect(runs).toBe(1);

    // Await microtask queue drain
    await Promise.resolve();

    // Effect executed exactly once with final values
    expect(runs).toBe(2);
    expect(lastObserved).toBe('3-20');

    stop();
  });

  it('supports flushSync() for immediate synchronous draining', () => {
    const count = signal(0);
    let observed = -1;

    const stop = effect(() => {
      observed = count();
    });

    expect(observed).toBe(0);

    count.set(42);
    expect(observed).toBe(0); // Still pending microtask

    flushSync();
    expect(observed).toBe(42); // Flushed synchronously!

    stop();
  });

  it('executes teardown cleanup before subsequent executions and on disposal', async () => {
    const source = signal('init');
    const logs: string[] = [];

    const stop = effect(() => {
      const val = source();
      logs.push(`run:${val}`);
      return () => {
        logs.push(`cleanup:${val}`);
      };
    });

    expect(logs).toEqual(['run:init']);

    // Mutate and flush
    source.set('second');
    await Promise.resolve();

    expect(logs).toEqual([
      'run:init',
      'cleanup:init',
      'run:second',
    ]);

    // Dispose
    stop();
    expect(logs).toEqual([
      'run:init',
      'cleanup:init',
      'run:second',
      'cleanup:second',
    ]);
  });

  it('dynamically prunes unread dependency branches', async () => {
    const show = signal(true);
    const left = signal('L1');
    const right = signal('R1');
    let observed = '';
    let runs = 0;

    const stop = effect(() => {
      runs++;
      observed = show() ? left() : right();
    });

    expect(observed).toBe('L1');
    expect(runs).toBe(1);

    // Modifying right (inactive branch) should NOT schedule effect
    right.set('R2');
    await Promise.resolve();
    expect(runs).toBe(1);

    // Switch to right
    show.set(false);
    await Promise.resolve();
    expect(observed).toBe('R2');
    expect(runs).toBe(2);

    // Now left is inactive; modifying left should NOT schedule effect
    left.set('L2');
    await Promise.resolve();
    expect(runs).toBe(2);

    // Modifying right triggers effect
    right.set('R3');
    await Promise.resolve();
    expect(observed).toBe('R3');
    expect(runs).toBe(3);

    stop();
  });

  it('does not re-execute when upstream computed memoizes identical value', async () => {
    const count = signal(2);
    let effectRuns = 0;

    // isEven only changes when parity flips
    const isEven = computed(() => count() % 2 === 0);

    const stop = effect(() => {
      effectRuns++;
      isEven();
    });

    expect(effectRuns).toBe(1);

    // Setting count to 4: parity is still even (true)
    count.set(4);
    await Promise.resolve();

    // Effect did NOT re-run because computed memoized and didn't bump version!
    expect(effectRuns).toBe(1);

    // Setting count to 5: parity flips to false
    count.set(5);
    await Promise.resolve();

    expect(effectRuns).toBe(2);

    stop();
  });

  it('halts tracking immediately upon disposal', async () => {
    const s = signal(1);
    let observed = 0;

    const stop = effect(() => {
      observed = s();
    });

    expect(observed).toBe(1);
    stop.dispose();

    s.set(99);
    await Promise.resolve();

    // Did not re-run
    expect(observed).toBe(1);
  });

  it('detects infinite reactive loop cycles and throws error', () => {
    const count = signal(0);

    // Effect updates its own dependency inside its body
    expect(() => {
      effect(() => {
        if (count() < 200) {
          count.set(count() + 1);
        }
      });
      flushSync();
    }).toThrow(/Maximum cascading update depth/);
  });

  it('verifies isEffect type guard', () => {
    const handle = effect(() => {});
    expect(isEffect(handle)).toBe(true);
    expect(isEffect(() => {})).toBe(false);
    expect(isEffect(null)).toBe(false);
    handle();
  });

  it('supports TC39 Signal.Effect instantiation', () => {
    const val = signal('tc39');
    let seen = '';

    const eff = new Signal.Effect(() => {
      seen = val();
    });

    expect(seen).toBe('tc39');
    eff.dispose();
  });

  it('executes high-throughput coalesced benchmark (10,000 writes in under 30ms)', async () => {
    const state = signal(0);
    let runs = 0;

    const stop = effect(() => {
      runs++;
      state();
    });

    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      state.set(i);
    }
    flushSync();
    const elapsed = performance.now() - start;

    expect(runs).toBe(2); // Initial run + single coalesced batch flush!
    expect(elapsed).toBeLessThan(30);

    stop();
  });
});
