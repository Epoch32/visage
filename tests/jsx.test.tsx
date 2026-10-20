import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { For, Index, render, Show, setAttribute } from "../src";
import { signal } from "../src/signals";

describe("Visage JSX & Direct DOM", () => {
  let container: any;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("renders fine-grained reactive text nodes without VDOM diffing", () => {
    const count = signal(0);
    const unmount = render(
      () => (
        <div id="counter">
          Count is: <span class="num">{count}</span>
        </div>
      ),
      container
    );

    const span = container.querySelector(".num");
    expect(span?.textContent).toBe("0");

    const textNodeBefore = span?.firstChild;

    // Mutate signal
    count.set(42);
    expect(span?.textContent).toBe("42");

    // Exact same TextNode mutated in place! (Zero VDOM recreation)
    expect(span?.firstChild).toBe(textNodeBefore);

    unmount();
  });

  it("binds reactive attributes and event handlers", () => {
    const isPrimary = signal(false);
    const clicked = signal(0);

    const unmount = render(
      () => (
        <button
          class={() => (isPrimary() ? "btn-primary" : "btn-secondary")}
          onClick={() => clicked.update((n) => n + 1)}
        >
          Click Me
        </button>
      ),
      container
    );

    const btn = container.querySelector("button")!;
    expect(btn.getAttribute("class")).toBe("btn-secondary");

    isPrimary.set(true);
    expect(btn.getAttribute("class")).toBe("btn-primary");

    btn.click();
    expect(clicked()).toBe(1);

    unmount();
  });

  it("dispatches delegated events with zero-allocation data arguments", () => {
    const selected = signal<number | null>(null);
    const select = (id: number) => selected.set(id);

    const unmount = render(
      () => (
        <div>
          <button id="b1" onClick={[select, 101] as any}>
            Item 101
          </button>
          <button id="b2" onClick={[select, 202] as any}>
            Item 202
          </button>
        </div>
      ),
      container
    );

    const b1 = container.querySelector("#b1")!;
    const b2 = container.querySelector("#b2")!;

    b1.click();
    expect(selected()).toBe(101);

    b2.click();
    expect(selected()).toBe(202);

    unmount();
  });

  it("reconciles conditional rendering with <Show>", () => {
    const loggedIn = signal(false);

    const unmount = render(
      () => (
        <div>
          <Show when={loggedIn} fallback={<p class="guest">Please Log In</p>}>
            <p class="user">Welcome Back!</p>
          </Show>
        </div>
      ),
      container
    );

    expect(container.querySelector(".guest")).not.toBeNull();
    expect(container.querySelector(".user")).toBeNull();

    loggedIn.set(true);
    expect(container.querySelector(".guest")).toBeNull();
    expect(container.querySelector(".user")?.textContent).toBe("Welcome Back!");

    unmount();
  });

  it("reconciles reactive lists with <For>", () => {
    const todos = signal(["Buy milk", "Learn Visage"]);

    const unmount = render(
      () => (
        <ul>
          <For each={todos}>{(item, index) => <li data-index={index}>{item}</li>}</For>
        </ul>
      ),
      container
    );

    const lis = container.querySelectorAll("li");
    expect(lis.length).toBe(2);
    expect(lis[0]?.textContent).toBe("Buy milk");
    expect(lis[0]?.getAttribute("data-index")).toBe("0");
    expect(lis[1]?.textContent).toBe("Learn Visage");
    expect(lis[1]?.getAttribute("data-index")).toBe("1");

    // Prepend item
    todos.set(["Wake up", "Buy milk", "Learn Visage"]);
    const updatedLis = container.querySelectorAll("li");
    expect(updatedLis.length).toBe(3);
    expect(updatedLis[0]?.textContent).toBe("Wake up");
    expect(updatedLis[0]?.getAttribute("data-index")).toBe("0");
    expect(updatedLis[1]?.textContent).toBe("Buy milk");
    expect(updatedLis[1]?.getAttribute("data-index")).toBe("1");
    expect(updatedLis[2]?.textContent).toBe("Learn Visage");
    expect(updatedLis[2]?.getAttribute("data-index")).toBe("2");

    // Reorder items
    todos.set(["Learn Visage", "Wake up", "Buy milk"]);
    const reorderedLis = container.querySelectorAll("li");
    expect(reorderedLis[0]?.textContent).toBe("Learn Visage");
    expect(reorderedLis[0]?.getAttribute("data-index")).toBe("0");
    expect(reorderedLis[1]?.textContent).toBe("Wake up");
    expect(reorderedLis[1]?.getAttribute("data-index")).toBe("1");
    expect(reorderedLis[2]?.textContent).toBe("Buy milk");
    expect(reorderedLis[2]?.getAttribute("data-index")).toBe("2");

    unmount();
  });

  it("preserves item event listeners and updates reactive classes in <For>", () => {
    const tabs = [
      { id: "bun", label: "bun" },
      { id: "pnpm", label: "pnpm" },
      { id: "npm", label: "npm" }
    ];
    const activeTab = signal("bun");

    const unmount = render(
      () => (
        <div>
          <For each={() => tabs}>
            {(tab) => (
              <button
                id={`tab-${tab.id}`}
                type="button"
                onClick={() => activeTab.set(tab.id)}
                class={() => (activeTab() === tab.id ? "tab-active" : "tab-inactive")}
              >
                {tab.label}
              </button>
            )}
          </For>
        </div>
      ),
      container
    );

    const btnBun = container.querySelector("#tab-bun")!;
    const btnPnpm = container.querySelector("#tab-pnpm")!;
    const btnNpm = container.querySelector("#tab-npm")!;

    expect(btnBun.getAttribute("class")).toBe("tab-active");
    expect(btnPnpm.getAttribute("class")).toBe("tab-inactive");

    // Click pnpm (forward)
    btnPnpm.click();
    expect(activeTab()).toBe("pnpm");
    expect(btnBun.getAttribute("class")).toBe("tab-inactive");
    expect(btnPnpm.getAttribute("class")).toBe("tab-active");

    // Click npm (forward)
    btnNpm.click();
    expect(activeTab()).toBe("npm");
    expect(btnNpm.getAttribute("class")).toBe("tab-active");

    // Click bun (backward)
    btnBun.click();
    expect(activeTab()).toBe("bun");
    expect(btnBun.getAttribute("class")).toBe("tab-active");
    expect(btnNpm.getAttribute("class")).toBe("tab-inactive");

    unmount();
  });

  it("reconciles items with custom key extractor 'by'", () => {
    const list = signal([
      { id: "1", text: "Alpha" },
      { id: "2", text: "Beta" }
    ]);

    const unmount = render(
      () => (
        <ul>
          <For each={list} by={(item) => item.id}>
            {(item) => <li id={`item-${item.id}`}>{item.text}</li>}
          </For>
        </ul>
      ),
      container
    );

    const initialFirstNode = container.querySelector("#item-1");
    expect(initialFirstNode).toBeTruthy();
    expect(initialFirstNode?.textContent).toBe("Alpha");

    // Replace array with new object references sharing the same id
    list.set([
      { id: "1", text: "Alpha Updated" },
      { id: "2", text: "Beta" }
    ]);

    const updatedFirstNode = container.querySelector("#item-1");
    // Node is retained rather than torn down
    expect(updatedFirstNode).toBe(initialFirstNode);

    unmount();
  });

  it("supports two-way form bindings with bind:value and bind:checked", () => {
    const textSignal = signal("Hello Visage");
    const checkedSignal = signal(false);

    const unmount = render(
      () => (
        <div>
          <input id="text-input" bind:value={textSignal} />
          <input id="checkbox-input" type="checkbox" bind:checked={checkedSignal} />
        </div>
      ),
      container
    );

    const textEl = container.querySelector("#text-input") as HTMLInputElement;
    const checkEl = container.querySelector("#checkbox-input") as HTMLInputElement;

    // Initial state reflection
    expect(textEl.value).toBe("Hello Visage");
    expect(checkEl.checked).toBe(false);

    // Reactive update from signal
    textSignal.set("New Message");
    expect(textEl.value).toBe("New Message");

    checkedSignal.set(true);
    expect(checkEl.checked).toBe(true);

    // Event updates from user interaction
    textEl.value = "User typed this";
    textEl.dispatchEvent(new Event("input"));
    expect(textSignal()).toBe("User typed this");

    checkEl.checked = false;
    checkEl.dispatchEvent(new Event("change"));
    expect(checkedSignal()).toBe(false);

    unmount();
  });

  it("renders position-indexed lists with Index and preserves DOM nodes on item updates", () => {
    const items = signal(["Item A", "Item B"]);

    const unmount = render(
      () => (
        <ul id="index-list">
          <Index each={items} fallback={<li id="empty-fallback">No items</li>}>
            {(item, index) => <li id={`index-${index}`}>{() => `${index}: ${item()}`}</li>}
          </Index>
        </ul>
      ),
      container
    );

    // Initial render
    const nodeA = container.querySelector("#index-0");
    const nodeB = container.querySelector("#index-1");
    expect(nodeA).toBeTruthy();
    expect(nodeB).toBeTruthy();
    expect(nodeA?.textContent).toBe("0: Item A");
    expect(nodeB?.textContent).toBe("1: Item B");

    // In-place item update without re-creating DOM node
    items.set(["Updated A", "Item B"]);
    const updatedNodeA = container.querySelector("#index-0");
    expect(updatedNodeA).toBe(nodeA);
    expect(updatedNodeA?.textContent).toBe("0: Updated A");

    // Expand list
    items.set(["Updated A", "Item B", "Item C"]);
    const nodeC = container.querySelector("#index-2");
    expect(nodeC).toBeTruthy();
    expect(nodeC?.textContent).toBe("2: Item C");
    expect(container.querySelector("#index-0")).toBe(nodeA);

    // Shrink list
    items.set(["Only A"]);
    expect(container.querySelector("#index-0")).toBe(nodeA);
    expect(container.querySelector("#index-0")?.textContent).toBe("0: Only A");
    expect(container.querySelector("#index-1")).toBeNull();
    expect(container.querySelector("#index-2")).toBeNull();

    // Empty list -> fallback
    items.set([]);
    expect(container.querySelector("#index-0")).toBeNull();
    expect(container.querySelector("#empty-fallback")?.textContent).toBe("No items");

    // Repopulate from empty
    items.set(["Restored A"]);
    expect(container.querySelector("#empty-fallback")).toBeNull();
    expect(container.querySelector("#index-0")?.textContent).toBe("0: Restored A");

    unmount();
  });

  it("prevents listener leaks on non-delegated event updates and cleanups", () => {
    const el = document.createElement("div");
    let runs1 = 0;
    let runs2 = 0;
    const handler1 = () => {
      runs1++;
    };
    const handler2 = () => {
      runs2++;
    };

    // Initial attach
    setAttribute(el, "onScroll", handler1);
    el.dispatchEvent(new Event("scroll"));
    expect(runs1).toBe(1);
    expect(runs2).toBe(0);

    // Update to handler2 (stable listener reused, handler1 not invoked again)
    setAttribute(el, "onScroll", handler2);
    el.dispatchEvent(new Event("scroll"));
    expect(runs1).toBe(1);
    expect(runs2).toBe(1);

    // Remove listener with null
    setAttribute(el, "onScroll", null);
    el.dispatchEvent(new Event("scroll"));
    expect(runs1).toBe(1);
    expect(runs2).toBe(1); // neither called
  });

  it("handles non-event props starting with on as attributes", () => {
    const el = document.createElement("div");
    setAttribute(el, "only", "sidebar");
    expect(el.getAttribute("only")).toBe("sidebar");
  });

  it("instantiates SVG 2 elements in the SVG namespace", () => {
    const unmount = render(
      () => (
        <svg viewBox="0 0 100 100">
          <title>Test SVG</title>
          <filter id="blur">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <mask id="my-mask">
            <rect width="100" height="100" fill="white" />
          </mask>
          <pattern id="pat" width="10" height="10" />
          <marker id="arrow" />
          <use href="#arrow" />
          <foreignObject width="50" height="50">
            <div>HTML content</div>
          </foreignObject>
        </svg>
      ),
      container
    );

    const svg = container.querySelector("svg")!;
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");

    const filter = container.querySelector("filter")!;
    expect(filter.namespaceURI).toBe("http://www.w3.org/2000/svg");

    const mask = container.querySelector("mask")!;
    expect(mask.namespaceURI).toBe("http://www.w3.org/2000/svg");

    const pattern = container.querySelector("pattern")!;
    expect(pattern.namespaceURI).toBe("http://www.w3.org/2000/svg");

    const marker = container.querySelector("marker")!;
    expect(marker.namespaceURI).toBe("http://www.w3.org/2000/svg");

    const use = container.querySelector("use")!;
    expect(use.namespaceURI).toBe("http://www.w3.org/2000/svg");

    const foreignObject = container.querySelector("foreignObject")!;
    expect(foreignObject.namespaceURI).toBe("http://www.w3.org/2000/svg");

    unmount();
  });
});
