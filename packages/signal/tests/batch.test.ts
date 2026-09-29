import { describe, expect, it } from 'bun:test';
import { signal, batch, untrack, ReactiveNode, setActiveConsumer } from '../src';

class TestConsumer extends ReactiveNode {
  notifications = 0;

  override checkDirty(): boolean {
    return false;
  }

  override notify(): void {
    this.notifications++;
  }
}

describe('Signal Batching & Untracking', () => {
  it('defers notifications until the outermost batch completes', () => {
    const s1 = signal(1);
    const s2 = signal(2);
    const consumer = new TestConsumer();

    // Register dependency
    const prev = setActiveConsumer(consumer);
    s1();
    s2();
    setActiveConsumer(prev);

    expect(consumer.notifications).toBe(0);

    // Update inside batch
    batch(() => {
      s1.set(10);
      s2.set(20);
      expect(consumer.notifications).toBe(0); // Not notified yet!
    });

    // Flushed once on batch completion
    expect(consumer.notifications).toBe(1);
  });

  it('supports deeply nested batch transactions', () => {
    const s = signal(0);
    const consumer = new TestConsumer();

    const prev = setActiveConsumer(consumer);
    s();
    setActiveConsumer(prev);

    batch(() => {
      s.set(1);
      batch(() => {
        s.set(2);
        batch(() => {
          s.set(3);
        });
        expect(consumer.notifications).toBe(0);
      });
      expect(consumer.notifications).toBe(0);
    });

    expect(consumer.notifications).toBe(1);
    expect(s()).toBe(3);
  });

  it('untrack executes callback without subscribing the active consumer', () => {
    const s = signal('secret');
    const consumer = new TestConsumer();

    const prev = setActiveConsumer(consumer);
    const val = untrack(() => s());
    setActiveConsumer(prev);

    expect(val).toBe('secret');

    // Updating s should NOT notify consumer because it was untracked
    s.set('revealed');
    expect(consumer.notifications).toBe(0);
  });
});
