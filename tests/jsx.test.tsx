import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { For, render, Show } from "../src";
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
    expect(lis[1]?.textContent).toBe("Learn Visage");

    // Prepend item
    todos.set(["Wake up", "Buy milk", "Learn Visage"]);
    const updatedLis = container.querySelectorAll("li");
    expect(updatedLis.length).toBe(3);
    expect(updatedLis[0]?.textContent).toBe("Wake up");

    unmount();
  });
});
