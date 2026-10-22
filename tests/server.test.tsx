import { describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { NoScript } from "../src/dom";
import { hydrate, renderToStream, renderToString } from "../src/server";
import { signal } from "../src/signals";

describe("Visage Server-Side Rendering (SSR)", () => {
  it("renders static elements and custom components to HTML string", () => {
    function Header(props: { title: string }) {
      return (
        <header class="main-header">
          <h1>{props.title}</h1>
        </header>
      );
    }

    const html = renderToString(() => (
      <div id="app">
        <Header title="Welcome to Visage" />
        <p class="intro">Lightning fast SSR</p>
      </div>
    ));

    expect(html).toBe(
      '<div id="app"><header class="main-header"><h1>Welcome to Visage</h1></header><p class="intro">Lightning fast SSR</p></div>'
    );
  });

  it("resolves reactive signals and computed values during SSR", () => {
    const count = signal(42);

    const html = renderToString(() => (
      <div class="counter-view">
        <span class="count">Count: {count}</span>
      </div>
    ));

    expect(html).toBe('<div class="counter-view"><span class="count">Count: 42</span></div>');
  });

  it("handles void elements and attributes properly", () => {
    const html = renderToString(() => (
      <form action="/login" method="POST">
        <input type="text" name="username" placeholder="Username" />
        <img src="/logo.png" alt="Logo" />
        <button type="submit">Submit</button>
      </form>
    ));

    expect(html).toContain('<input type="text" name="username" placeholder="Username" />');
    expect(html).toContain('<img src="/logo.png" alt="Logo" />');
    expect(html).toContain('<button type="submit">Submit</button>');
  });

  it("streams HTML progressively using renderToStream", async () => {
    const stream = renderToStream(() => (
      <div class="streamed-box">
        <h2>Streamed Header</h2>
        <p>Streamed Paragraph</p>
      </div>
    ));

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let resultHtml = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      resultHtml += decoder.decode(value);
    }

    expect(resultHtml).toContain("Streamed Header");
    expect(resultHtml).toContain("Streamed Paragraph");
  });

  it("hydrates server-rendered HTML seamlessly", () => {
    const container = document.createElement("div");
    const count = signal(0);

    // Simulate server rendered HTML
    container.innerHTML = '<div>Count: <span class="num">0</span></div>';
    const divBefore = container.firstElementChild;
    const spanBefore = container.querySelector(".num");

    // Hydrate
    const unmount = hydrate(
      () => (
        <div>
          Count: <span class="num">{count}</span>
        </div>
      ),
      container
    );

    // Verify existing DOM elements were preserved and not replaced
    expect(container.firstElementChild).toBe(divBefore);
    expect(container.querySelector(".num")).toBe(spanBefore);

    // Mutate signal on client
    count.set(5);
    expect(container.querySelector(".num")?.textContent).toBe("5");

    unmount();
  });

  it("attaches event listeners to existing server-rendered elements during hydration", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = '<button class="btn">Click me</button>';
    const btnBefore = container.firstElementChild as HTMLButtonElement;

    let clicked = false;
    const unmount = hydrate(
      () => (
        <button
          class="btn"
          onClick={() => {
            clicked = true;
          }}
        >
          Click me
        </button>
      ),
      container
    );

    expect(container.firstElementChild).toBe(btnBefore);
    btnBefore.click();
    expect(clicked).toBe(true);

    unmount();
    document.body.removeChild(container);
  });

  it("renders NoScript component with message prop or children during SSR", () => {
    const htmlWithMessage = renderToString(() => (
      <NoScript message="JavaScript is required to use this application." />
    ));
    expect(htmlWithMessage).toBe(
      "<noscript>JavaScript is required to use this application.</noscript>"
    );

    const htmlWithChildren = renderToString(() => (
      <NoScript class="custom-noscript" style="display: block;">
        <div class="warning">Please turn on JavaScript</div>
      </NoScript>
    ));
    expect(htmlWithChildren).toBe(
      '<noscript class="custom-noscript" style="display: block;"><div class="warning">Please turn on JavaScript</div></noscript>'
    );
  });
});
