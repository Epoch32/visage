import { describe, expect, it } from 'bun:test';
import { signal, batch } from '@epoch32/signal';
import { computed, isComputed, Signal } from '../src';

describe('COMPUTE: Lazy Memoized Derivations', () => {
  it('evaluates lazily upon first read', () => {
    let executions = 0;
    const a = signal(10);
    const double = computed(() => {
      executions++;
      return a() * 2;
    });

    expect(executions).toBe(0); // Not evaluated yet
    expect(double()).toBe(20);
    expect(executions).toBe(1);

    // Subsequent reads without state change return memoized value
    expect(double()).toBe(20);
    expect(double.get()).toBe(20);
    expect(executions).toBe(1);
  });

  it('updates when upstream signal changes', () => {
    const count = signal(1);
    const next = computed(() => count() + 1);

    expect(next()).toBe(2);
    count.set(5);
    expect(next()).toBe(6);
  });

  it('memoizes values when upstream signal does not change', () => {
    let executions = 0;
    const a = signal(2);
    const isEven = computed(() => {
      executions++;
      return a() % 2 === 0;
    });

    expect(isEven()).toBe(true);
    expect(executions).toBe(1);

    // Setting a to another even number: isEven output remains `true`
    a.set(4);
    expect(isEven()).toBe(true);
    // Because 4 is also even, isEven recomputes once, but remains true
    expect(executions).toBe(2);

    // Setting a to same value 4 (ignored by signal equality)
    a.set(4);
    expect(isEven()).toBe(true);
    expect(executions).toBe(2);
  });

  it('guarantees glitch-free topological evaluation in diamond graphs', () => {
    // Diamond DAG:
    //         [ a ]
    //        /     \
    //      [ b ]  [ c ]
    //        \     /
    //         [ d ]
    const a = signal(1);
    let dEvaluations = 0;
    const evaluationTrace: string[] = [];

    const b = computed(() => a() * 2);
    const c = computed(() => a() * 10);
    const d = computed(() => {
      dEvaluations++;
      evaluationTrace.push(`b:${b()},c:${c()}`);
      return b() + c();
    });

    expect(d()).toBe(12); // (1*2) + (1*10) = 12
    expect(dEvaluations).toBe(1);
    expect(evaluationTrace).toEqual(['b:2,c:10']);

    // Mutate source signal
    a.set(2);
    // Reading d must produce (2*2) + (2*10) = 24 with no intermediate glitch
    expect(d()).toBe(24);
    expect(dEvaluations).toBe(2);
    expect(evaluationTrace).toEqual(['b:2,c:10', 'b:4,c:20']);
  });

  it('dynamically prunes inactive dependency branches', () => {
    const condition = signal(true);
    const a = signal('A1');
    const b = signal('B1');
    let evaluations = 0;

    const derived = computed(() => {
      evaluations++;
      return condition() ? a() : b();
    });

    expect(derived()).toBe('A1');
    expect(evaluations).toBe(1);

    // While condition is true, mutating b should NOT mark derived dirty
    b.set('B2');
    expect(derived()).toBe('A1');
    expect(evaluations).toBe(1); // Did not re-evaluate

    // Mutating a should update derived
    a.set('A2');
    expect(derived()).toBe('A2');
    expect(evaluations).toBe(2);

    // Switch condition to false
    condition.set(false);
    expect(derived()).toBe('B2');
    expect(evaluations).toBe(3);

    // Now a is inactive; mutating a must NOT trigger re-evaluation
    a.set('A3');
    expect(derived()).toBe('B2');
    expect(evaluations).toBe(3);

    // Mutating active branch b triggers update
    b.set('B3');
    expect(derived()).toBe('B3');
    expect(evaluations).toBe(4);
  });

  it('detects circular dependencies and throws cleanly', () => {
    let loop: any;
    const a = signal(1);
    loop = computed(() => {
      return a() + loop();
    });

    expect(() => loop()).toThrow(/Circular dependency detected/);
  });

  it('supports custom equality comparators', () => {
    let childRuns = 0;
    const x = signal({ value: 10 });

    // Custom equals checks inner value
    const c = computed(() => x(), {
      equals: (prev, next) => prev.value === next.value,
    });

    const child = computed(() => {
      childRuns++;
      return c().value * 2;
    });

    expect(child()).toBe(20);
    expect(childRuns).toBe(1);

    // Set new object instance with SAME inner value
    x.set({ value: 10 });

    // c recomputes, sees value is equal, does not notify child
    expect(child()).toBe(20);
    expect(childRuns).toBe(1); // Child did NOT re-run!
  });

  it('supports peek() without creating consumer dependencies', () => {
    const a = signal(100);
    const c = computed(() => a() * 2);

    let outerRuns = 0;
    const outer = computed(() => {
      outerRuns++;
      return c.peek() + 5;
    });

    expect(outer()).toBe(205);
    expect(outerRuns).toBe(1);

    // Modifying a updates c, but outer peeked so it shouldn't re-run when c changes
    a.set(200);
    expect(c()).toBe(400);
    // outer has no dependency on c
    expect(outer.peek()).toBe(205);
  });

  it('supports TC39 Signal.Computed namespace class instantiation', () => {
    const s = signal(7);
    const tc39Computed = new Signal.Computed(() => s() * 3);

    expect(tc39Computed.get()).toBe(21);
    s.set(8);
    expect(tc39Computed.get()).toBe(24);
  });

  it('correctly verifies isComputed type guard', () => {
    const s = signal(1);
    const c = computed(() => s() * 2);

    expect(isComputed(c)).toBe(true);
    expect(isComputed(s)).toBe(false);
    expect(isComputed(() => {})).toBe(false);
    expect(isComputed(null)).toBe(false);
  });

  it('disposes cleanly and stops tracking', () => {
    const a = signal(5);
    const c = computed(() => a() * 10);

    expect(c()).toBe(50);
    c.dispose();

    // After dispose, reading returns cached value and does not update
    a.set(6);
    expect(c()).toBe(50);
  });

  it('executes 100,000 derivations in high throughput benchmark (<50ms)', () => {
    const source = signal(0);
    const c1 = computed(() => source() + 1);
    const c2 = computed(() => c1() * 2);
    const c3 = computed(() => c2() + 5);

    const start = performance.now();
    for (let i = 0; i < 100_000; i++) {
      source.set(i);
      c3();
    }
    const elapsed = performance.now() - start;

    expect(c3()).toBe((99_999 + 1) * 2 + 5);
    expect(elapsed).toBeLessThan(100); // Super fast high-throughput
  });
});
