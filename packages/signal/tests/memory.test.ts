import { describe, expect, it } from 'bun:test';
import { signal, batch } from '../src';

describe('Zero-Allocation & Performance Invariants', () => {
  it('executes 100,000 writes in under 50ms', () => {
    const s = signal(0);
    const start = performance.now();

    for (let i = 1; i <= 100_000; i++) {
      s.set(i);
    }

    const duration = performance.now() - start;
    expect(s()).toBe(100_000);
    expect(duration).toBeLessThan(50); // High-speed execution
  });

  it('executes 100,000 batched writes with atomic single flush', () => {
    const s = signal(0);
    const start = performance.now();

    batch(() => {
      for (let i = 1; i <= 100_000; i++) {
        s.set(i);
      }
    });

    const duration = performance.now() - start;
    expect(s()).toBe(100_000);
    expect(duration).toBeLessThan(50);
  });
});
