import { describe, expect, it } from 'bun:test';
import { signal, isSignal } from '../src';

describe('Signal Atomic State', () => {
  it('creates and reads initial value via call and get()', () => {
    const s = signal(42);
    expect(s()).toBe(42);
    expect(s.get()).toBe(42);
    expect(s.peek()).toBe(42);
  });

  it('updates value and increments version', () => {
    const s = signal('initial');
    const v1 = s.version;

    s.set('updated');
    expect(s()).toBe('updated');
    expect(s.version).toBeGreaterThan(v1);
  });

  it('supports functional update()', () => {
    const s = signal(10);
    s.update((n) => n * 2);
    expect(s()).toBe(20);
    s.update((n) => n + 5);
    expect(s()).toBe(25);
  });

  it('does not bump version if value is identical (Object.is)', () => {
    const s = signal(100);
    const v1 = s.version;
    s.set(100);
    expect(s.version).toBe(v1);
  });

  it('honors custom equality comparators', () => {
    const s = signal({ id: 1, name: 'Alice' }, {
      equals: (a, b) => a.id === b.id,
    });
    const v1 = s.version;

    // Same ID, different name -> considered equal, no version bump
    s.set({ id: 1, name: 'Bob' });
    expect(s.version).toBe(v1);
    expect(s().name).toBe('Alice'); // not overwritten

    // Different ID -> updates
    s.set({ id: 2, name: 'Charlie' });
    expect(s.version).toBeGreaterThan(v1);
    expect(s().name).toBe('Charlie');
  });

  it('correctly identifies signals with isSignal()', () => {
    const s = signal(0);
    expect(isSignal(s)).toBe(true);
    expect(isSignal(() => {})).toBe(false);
    expect(isSignal(null)).toBe(false);
    expect(isSignal(42)).toBe(false);
  });
});
