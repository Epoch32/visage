import type { Scope, WritableSignal } from "@signals";

export class ItemRecord<T> {
  item: T;
  key: any;
  scope: Scope;
  node: Node;
  extraNodes: Node[] | null;
  indexSignal?: WritableSignal<number>;

  get nodes(): Node[] {
    if (this.extraNodes === null) return [this.node];
    return [this.node, ...this.extraNodes];
  }

  get firstNode(): Node {
    return this.node;
  }

  constructor(
    item: T,
    key: any,
    scope: Scope,
    node: Node,
    extraNodes: Node[] | null = null,
    indexSignal?: WritableSignal<number>
  ) {
    this.item = item;
    this.key = key;
    this.scope = scope;
    this.node = node;
    this.extraNodes = extraNodes;
    this.indexSignal = indexSignal;
  }

  append(target: Node | DocumentFragment): void {
    target.appendChild(this.node);
    if (this.extraNodes !== null) {
      for (let j = 0; j < this.extraNodes.length; j++) {
        target.appendChild(this.extraNodes[j]!);
      }
    }
  }

  remove(): void {
    if (this.extraNodes === null) {
      if (this.node.parentNode) this.node.parentNode.removeChild(this.node);
    } else {
      for (const n of this.nodes) {
        if (n.parentNode) n.parentNode.removeChild(n);
      }
    }
  }

  insertBefore(parent: Node, before: Node | null): void {
    if (this.extraNodes === null) {
      parent.insertBefore(this.node, before);
    } else {
      for (const n of this.nodes) {
        parent.insertBefore(n, before);
      }
    }
  }

  dispose(): void {
    this.scope.dispose();
  }
}
