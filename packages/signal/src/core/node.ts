import { CLEAN, CHECK_DIRTY, DIRTY, DISPOSED } from './flags';
import { type Link, allocateLink, releaseLink } from './link';

/** Global monotonic clock incremented on write transactions */
let globalClock = 1;

export function getGlobalClock(): number {
  return globalClock;
}

export function incrementClock(): number {
  return ++globalClock;
}

/** Active consumer evaluating on the execution stack */
let activeConsumer: ReactiveNode | null = null;

export function getActiveConsumer(): ReactiveNode | null {
  return activeConsumer;
}

export function setActiveConsumer(consumer: ReactiveNode | null): ReactiveNode | null {
  const prev = activeConsumer;
  activeConsumer = consumer;
  return prev;
}

/**
 * Base reactive node in the dependency graph.
 */
export abstract class ReactiveNode {
  /** Bitfield flags (CLEAN, CHECK_DIRTY, DIRTY, RUNNING, DISPOSED) */
  flags: number = CLEAN;

  /** Monotonic version counter */
  version: number = 0;

  /** Head of subscriber link list (downstream consumers) */
  subsHead: Link | null = null;
  /** Tail of subscriber link list */
  subsTail: Link | null = null;

  /** Head of dependency link list (upstream producers) */
  depsHead: Link | null = null;
  /** Tail of dependency link list */
  depsTail: Link | null = null;

  /** Called when this node needs to verify whether its value changed */
  abstract checkDirty(): boolean;

  /** Called when an upstream dependency signals a change */
  abstract notify(): void;
}

/**
 * Registers a dependency edge between producer and consumer.
 */
export function trackDependency(dep: ReactiveNode, sub: ReactiveNode): void {
  // If the consumer already has this dependency as its most recent, avoid duplicate check
  if (sub.depsTail && sub.depsTail.dep === dep) {
    return;
  }

  // Scan existing dependencies in sub to see if this link already exists
  let existing = sub.depsHead;
  while (existing) {
    if (existing.dep === dep) {
      existing.version = dep.version;
      return;
    }
    existing = existing.nextDep || null;
  }

  // Create new link
  const link = allocateLink(sub, dep, dep.version);

  // Append to consumer's dependency list
  if (!sub.depsHead) {
    sub.depsHead = link;
    sub.depsTail = link;
  } else {
    link.prevDep = sub.depsTail;
    sub.depsTail!.nextDep = link;
    sub.depsTail = link;
  }

  // Append to producer's subscriber list
  if (!dep.subsHead) {
    dep.subsHead = link;
    dep.subsTail = link;
  } else {
    link.prevSub = dep.subsTail;
    dep.subsTail!.nextSub = link;
    dep.subsTail = link;
  }
}

/**
 * Propagates dirty notifications down the DAG to all registered subscribers.
 */
export function propagateChange(node: ReactiveNode): void {
  let link = node.subsHead;
  const subs: ReactiveNode[] = [];
  while (link) {
    if (link.sub) {
      subs.push(link.sub);
    }
    link = link.nextSub || null;
  }

  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i];
    if (!(sub.flags & (DIRTY | DISPOSED))) {
      sub.flags |= DIRTY;
      sub.notify();
    }
  }
}

/**
 * Removes all dependency links for a consumer node (used before re-evaluation or on disposal).
 */
export function clearDependencies(sub: ReactiveNode): void {
  let link = sub.depsHead;
  while (link) {
    const next = link.nextDep || null;
    const dep = link.dep;

    // Unlink from producer's subscriber list
    if (link.prevSub) {
      link.prevSub.nextSub = link.nextSub;
    } else if (dep && dep.subsHead === link) {
      dep.subsHead = link.nextSub || null;
    }

    if (link.nextSub) {
      link.nextSub.prevSub = link.prevSub;
    } else if (dep && dep.subsTail === link) {
      dep.subsTail = link.prevSub || null;
    }

    releaseLink(link);
    link = next;
  }

  sub.depsHead = null;
  sub.depsTail = null;
}
