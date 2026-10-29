/**
 * Visage Reactive Dependency Tracking Base Engine
 */
import type { IDependency, ISubscriber, SubscriberState } from "./types";

/**
 * Common base class managing unrolled 2-slot dependency tracking
 * for both Computed and Effect subscribers.
 *
 * Implements inline 2-slot optimization (_source0, _source1) and
 * promotes to Set/Map collections for 3+ sources. Collections are
 * cleared and reused across recomputations to eliminate GC pressure.
 */
export abstract class DependencyTracker implements ISubscriber {
  protected _source0: IDependency | null = null;
  protected _version0 = 0;
  protected _source1: IDependency | null = null;
  protected _version1 = 0;
  protected _sources: Set<IDependency> | null = null;
  protected _sourceVersions: Map<IDependency, number> | null = null;

  get sources(): Set<IDependency> {
    if (this._sources !== null) return this._sources;
    const s = new Set<IDependency>();
    if (this._source0 !== null) s.add(this._source0);
    if (this._source1 !== null) s.add(this._source1);
    return s;
  }

  get sourceVersions(): Map<IDependency, number> {
    if (this._sourceVersions !== null) return this._sourceVersions;
    const m = new Map<IDependency, number>();
    if (this._source0 !== null) m.set(this._source0, this._version0);
    if (this._source1 !== null) m.set(this._source1, this._version1);
    return m;
  }

  addSource(source: IDependency, version: number): void {
    if (this._sources !== null) {
      this._sources.add(source);
      this._sourceVersions!.set(source, version);
      return;
    }
    if (this._source0 === null) {
      this._source0 = source;
      this._version0 = version;
      return;
    }
    if (this._source0 === source) {
      this._version0 = version;
      return;
    }
    if (this._source1 === null) {
      this._source1 = source;
      this._version1 = version;
      return;
    }
    if (this._source1 === source) {
      this._version1 = version;
      return;
    }

    const s = this._sources ?? new Set<IDependency>();
    const m = this._sourceVersions ?? new Map<IDependency, number>();
    s.add(this._source0);
    m.set(this._source0, this._version0);
    s.add(this._source1);
    m.set(this._source1, this._version1);
    s.add(source);
    m.set(source, version);
    this._sources = s;
    this._sourceVersions = m;
    this._source0 = null;
    this._source1 = null;
  }

  protected cleanupSources(): void {
    if (this._sources !== null) {
      for (const source of this._sources) {
        source.removeSubscriber(this);
      }
      this._sources.clear();
      this._sourceVersions!.clear();
      return;
    }
    if (this._source0 !== null) {
      this._source0.removeSubscriber(this);
      this._source0 = null;
    }
    if (this._source1 !== null) {
      this._source1.removeSubscriber(this);
      this._source1 = null;
    }
  }

  protected clearSourcesOnDispose(): void {
    this.cleanupSources();
    this._sources = null;
    this._sourceVersions = null;
  }

  abstract state: SubscriberState;
  abstract markDirty(targetState?: SubscriberState): void;
  abstract dispose(): void;
}
