import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { createVirtualizer, render, signal, VirtualGrid, VirtualList } from "../src";

describe("Visage Virtualization (visage/virtual)", () => {
  let container: any;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("calculates virtual window and total size for 100,000 items", () => {
    const scrollEl = document.createElement("div") as any;
    Object.defineProperty(scrollEl, "clientHeight", {
      value: 500,
      configurable: true,
      writable: true
    });
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

  it("handles variable item heights with cached prefix offsets and dynamic measureElement", () => {
    const scrollEl = document.createElement("div") as any;
    Object.defineProperty(scrollEl, "clientHeight", {
      value: 300,
      configurable: true,
      writable: true
    });
    scrollEl.scrollTop = 0;

    // Items with variable heights: even items 40px, odd items 60px
    const getItemHeight = (i: number) => (i % 2 === 0 ? 40 : 60);

    const virtualizer = createVirtualizer({
      count: 100,
      itemHeight: getItemHeight,
      overscan: 1,
      getScrollElement: () => scrollEl
    });

    // 50 items * 40px + 50 items * 60px = 5,000px
    expect(virtualizer.totalSize()).toBe(5000);

    const items = virtualizer.virtualItems();
    expect(items[0]?.index).toBe(0);
    expect(items[0]?.start).toBe(0);
    expect(items[0]?.size).toBe(40);
    expect(items[1]?.index).toBe(1);
    expect(items[1]?.start).toBe(40);
    expect(items[1]?.size).toBe(60);

    // Measure element dynamic size override for index 0 to 100px
    const mockEl = {
      getBoundingClientRect: () => ({ height: 100, width: 200 })
    } as any;
    virtualizer.measureElement(mockEl, 0);

    // total size should increase by 60px (from 40 to 100)
    expect(virtualizer.totalSize()).toBe(5060);

    const updatedItems = virtualizer.virtualItems();
    expect(updatedItems[0]?.size).toBe(100);
    // index 1 start offset should shift from 40 to 100
    expect(updatedItems[1]?.start).toBe(100);
  });

  it("preserves row DOM element identity for visible items across scroll changes", () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Row #${i}`
    }));

    const scrollEl = document.createElement("div") as any;
    Object.defineProperty(scrollEl, "clientHeight", { value: 200, configurable: true });
    scrollEl.scrollTop = 0;

    const unmount = render(
      () => (
        <VirtualList each={items} itemHeight={40} height={200} overscan={2}>
          {(item, index) => (
            <div class="test-row" data-id={item.id} data-index={index}>
              {item.name}
            </div>
          )}
        </VirtualList>
      ),
      container
    );

    const firstRowBefore = container.querySelector('.test-row[data-id="1"]');
    expect(firstRowBefore).not.toBeNull();

    // Trigger scroll in container
    const scrollContainer = container.querySelector("div");
    if (scrollContainer) {
      scrollContainer.scrollTop = 20;
      scrollContainer.dispatchEvent(new Event("scroll"));
    }

    const firstRowAfter = container.querySelector('.test-row[data-id="1"]');
    expect(firstRowAfter).not.toBeNull();
    // Element identity must be preserved by keyed reconciliation!
    expect(firstRowAfter).toBe(firstRowBefore);

    unmount();
  });

  it("renders only visible cells with <VirtualGrid> and preserves cell DOM nodes with getItemKey", () => {
    // 500 rows x 50 columns
    const gridData = Array.from({ length: 500 }, (_, r) =>
      Array.from({ length: 50 }, (_, c) => ({
        id: `cell-${r}-${c}`,
        value: `R${r}C${c}`
      }))
    );

    const unmount = render(
      () => (
        <VirtualGrid
          data={gridData}
          rowHeight={40}
          columnWidth={100}
          height={200}
          width={300}
          overscan={1}
          getItemKey={(cell) => cell.id}
        >
          {(cell) => (
            <div class="test-cell" data-id={cell.id}>
              {cell.value}
            </div>
          )}
        </VirtualGrid>
      ),
      container
    );

    const renderedCells = container.querySelectorAll(".test-cell");
    // 25,000 total cells, but only visible viewport cells (~5-7 rows x 3-5 cols = ~30 cells) rendered!
    expect(renderedCells.length < 50).toBe(true);
    expect(renderedCells.length > 0).toBe(true);
    expect(renderedCells[0]?.textContent).toBe("R0C0");

    const firstCellBefore = container.querySelector('.test-cell[data-id="cell-0-0"]');
    expect(firstCellBefore).not.toBeNull();

    // Trigger scroll
    const scrollContainer = container.querySelector("div");
    if (scrollContainer) {
      scrollContainer.scrollTop = 10;
      scrollContainer.dispatchEvent(new Event("scroll"));
    }

    const firstCellAfter = container.querySelector('.test-cell[data-id="cell-0-0"]');
    expect(firstCellAfter).toBe(firstCellBefore);

    unmount();
  });
});
