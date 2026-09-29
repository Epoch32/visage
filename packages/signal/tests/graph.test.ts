import { describe, expect, it } from 'bun:test';
import { signal, ReactiveNode, setActiveConsumer, DIRTY } from '../src';
import { clearDependencies, trackDependency, propagateChange, getActiveConsumer, incrementClock } from '../src/core/node';

class MockComputation extends ReactiveNode {
  notifications = 0;
  computeFn: () => any;
  value: any;

  constructor(fn: () => any) {
    super();
    this.computeFn = fn;
    this.recompute();
  }

  get(): any {
    const consumer = getActiveConsumer();
    if (consumer) {
      trackDependency(this, consumer);
    }
    return this.value;
  }

  recompute(): any {
    this.flags &= ~DIRTY;
    clearDependencies(this);
    const prev = setActiveConsumer(this);
    try {
      this.value = this.computeFn();
    } finally {
      setActiveConsumer(prev);
    }
    this.version = incrementClock();
    propagateChange(this);
    return this.value;
  }

  override checkDirty(): boolean {
    return false;
  }

  override notify(): void {
    this.notifications++;
    this.recompute();
  }
}

describe('Reactive Graph Topologies', () => {
  it('handles linear dependency chains: S -> C1 -> C2', () => {
    const root = signal(10);
    const c1 = new MockComputation(() => root() * 2);
    const c2 = new MockComputation(() => c1.get() + 5);

    expect(c1.get()).toBe(20);
    expect(c2.get()).toBe(25);

    root.set(50);
    expect(c1.get()).toBe(100);
    expect(c2.get()).toBe(105);
  });

  it('handles diamond dependency propagation without leaks', () => {
    // A -> B, A -> C, (B, C) -> D
    const a = signal(2);
    const b = new MockComputation(() => a() * 10);
    const c = new MockComputation(() => a() * 100);
    const d = new MockComputation(() => b.get() + c.get());

    expect(d.get()).toBe(220); // 20 + 200

    a.set(3);
    expect(d.get()).toBe(330); // 30 + 300
  });

  it('correctly unlinks dependencies when cleared', () => {
    const s = signal('active');
    const comp = new MockComputation(() => s());

    expect(s.node.subsHead).not.toBeNull();

    clearDependencies(comp);
    expect(s.node.subsHead).toBeNull();
    expect(comp.depsHead).toBeNull();
  });
});
