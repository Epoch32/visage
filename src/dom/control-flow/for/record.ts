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
    if (this.node.parentNode) {
      this.node.parentNode.removeChild(this.node);
    }
    if (this.extraNodes !== null) {
      for (let j = 0; j < this.extraNodes.length; j++) {
        const extra = this.extraNodes[j]!;
        if (extra.parentNode) {
          extra.parentNode.removeChild(extra);
        }
      }
    }
  }

  insertBefore(parent: Node, before: Node | null): void {
    parent.insertBefore(this.node, before);
    if (this.extraNodes !== null) {
      for (let j = 0; j < this.extraNodes.length; j++) {
        parent.insertBefore(this.extraNodes[j]!, before);
      }
    }
  }

  dispose(): void {
    this.scope.dispose();
  }
}
