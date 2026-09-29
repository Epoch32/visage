import type { ReactiveNode } from './node';

/**
 * Link represents a directed edge in the reactive dependency graph:
 * sub (consumer) depends on dep (producer).
 *
 * Doubly-linked in two directions:
 * 1. Along the producer's subscriber list: prevSub <-> Link <-> nextSub
 * 2. Along the consumer's dependency list: prevDep <-> Link <-> nextDep
 */
export interface Link {
  /** The dependent consumer node */
  sub: ReactiveNode;
  /** The upstream producer node */
  dep: ReactiveNode;
  /** Previous link in the producer's subscriber list */
  prevSub?: Link | null;
  /** Next link in the producer's subscriber list */
  nextSub?: Link | null;
  /** Previous link in the consumer's dependency list */
  prevDep?: Link | null;
  /** Next link in the consumer's dependency list */
  nextDep?: Link | null;
  /** Version of the producer when this edge was last verified */
  version: number;
}

/** Pre-allocated object pool for recycling Link objects */
const LINK_POOL: Link[] = [];
const MAX_POOL_SIZE = 1024;

export function allocateLink(sub: ReactiveNode, dep: ReactiveNode, version: number): Link {
  const link = LINK_POOL.pop();
  if (link) {
    link.sub = sub;
    link.dep = dep;
    link.prevSub = null;
    link.nextSub = null;
    link.prevDep = null;
    link.nextDep = null;
    link.version = version;
    return link;
  }
  return {
    sub,
    dep,
    prevSub: null,
    nextSub: null,
    prevDep: null,
    nextDep: null,
    version,
  };
}

export function releaseLink(link: Link): void {
  link.sub = null as any;
  link.dep = null as any;
  link.prevSub = null;
  link.nextSub = null;
  link.prevDep = null;
  link.nextDep = null;
  if (LINK_POOL.length < MAX_POOL_SIZE) {
    LINK_POOL.push(link);
  }
}
