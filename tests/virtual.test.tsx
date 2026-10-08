import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { VirtualList, createVirtualizer, render, signal } from "../src";

describe("Visage Virtualization (visage/virtual)", () => {
  let container: any;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("calculates virtual window and total size for 100,000 items", () => {
    const scrollEl = document.createElement("div") as any;
    scrollEl.clientHeight = 500;
    scrollEl.scrollTop = 0;

    const virtualizer = createVirtualizer({
      count: 100_000,
      itemHeight: 50,
      overscan: 2,
      getScrollElement: () => scrollEl
    });

    // 100,000 items * 50px = 5,000,000px
    expect(virtualizer.totalSize()).toBe(5_000_000);

    // Initial visible range (height 500 / 50 = 10 items + 2 overscan = 12 items)
    const items = virtualizer.virtualItems();
    expect(items.length >= 10).toBe(true);
    expect(items[0]?.index).toBe(0);
    expect(items[0]?.start).toBe(0);
    expect(items[0]?.size).toBe(50);

    // Scroll down to 2,500px (item index 50)
    virtualizer.scrollToOffset(2500);
    expect(virtualizer.scrollOffset()).toBe(2500);

    const scrolledItems = virtualizer.virtualItems();
    expect((scrolledItems[0]?.index ?? 0) <= 50).toBe(true);
    expect((scrolledItems[scrolledItems.length - 1]?.index ?? 0) >= 55).toBe(true);
  });

  it("renders only visible DOM nodes for huge list with <VirtualList>", () => {
    const items = Array.from({ length: 50_000 }, (_, i) => ({
      id: i,
      name: `Item #${i}`
    }));

    const unmount = render(
      () => (
        <VirtualList each={items} itemHeight={40} height={400} overscan={2}>
          {(item, index) => (
            <div class="row" data-index={index}>
              <span>{item.name}</span>
            </div>
          )}
        </VirtualList>
      ),
      container
    );

    const renderedRows = container.querySelectorAll(".row");
    // Out of 50,000 items, only ~15 DOM nodes are in the document tree!
    expect(renderedRows.length < 25).toBe(true);
    expect(renderedRows.length > 0).toBe(true);
    expect(renderedRows[0].textContent).toContain("Item #0");

    unmount();
  });

  it("handles fine-grained item mutations inside virtualized list", () => {
    const todos = Array.from({ length: 10_000 }, (_, i) => ({
      id: i,
      title: signal(`Task ${i}`)
    }));

    const unmount = render(
      () => (
        <VirtualList each={todos} itemHeight={40} height={400}>
          {(todo) => (
            <div class="todo-row">
              <span>{todo.title}</span>
            </div>
          )}
        </VirtualList>
      ),
      container
    );

    const firstRow = container.querySelector(".todo-row");
    expect(firstRow.textContent).toContain("Task 0");

    // Mutate the signal of the first item directly
    todos[0]!.title.set("Updated Task Zero");
    expect(firstRow.textContent).toContain("Updated Task Zero");

    unmount();
  });
});
