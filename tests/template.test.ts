import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { signal } from "../src/signals";
import { html, template } from "../src/template";

describe("Visage Template Engine", () => {
  let container: any;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("clones pre-parsed templates with high performance", () => {
    const cardTemplate = template<HTMLDivElement>(
      `<div class="card"><h2 class="title">Product</h2><p class="desc">Details</p></div>`
    );

    const el1 = cardTemplate();
    const el2 = cardTemplate();

    expect(el1).not.toBe(el2); // Distinct cloned DOM nodes
    expect(el1.querySelector(".title")?.textContent).toBe("Product");
    expect(el2.querySelector(".desc")?.textContent).toBe("Details");
  });

  it("clones table row templates", () => {
    const rowTemplate = template<HTMLTableRowElement>(
      "<tr><td class='col-md-1'>1</td><td class='col-md-4'><a class='lbl'>text</a></td></tr>"
    );

    const tr = rowTemplate();
    expect(tr).toBeTruthy();
    expect(tr.tagName.toLowerCase()).toBe("tr");
    expect(tr.querySelector(".col-md-1")?.textContent).toBe("1");
    expect(tr.querySelector(".lbl")?.textContent).toBe("text");
  });

  it("clones table section and SVG child templates in their correct namespaces", () => {
    const tbodyTmpl = template<HTMLTableSectionElement>("<tbody><tr><td>Row</td></tr></tbody>");
    const tbody = tbodyTmpl();
    expect(tbody).toBeTruthy();
    expect(tbody.tagName.toLowerCase()).toBe("tbody");

    const circleTmpl = template<SVGCircleElement>('<circle cx="50" cy="50" r="40" fill="red" />');
    const circle = circleTmpl();
    expect(circle).toBeTruthy();
    expect(circle.tagName.toLowerCase()).toBe("circle");
    expect(circle.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });

  it("binds reactive signals and text nodes using html tagged template", () => {
    const count = signal(10);
    const title = signal("Counter App");

    const el = html`
      <div class="counter-box">
        <h1>${title}</h1>
        <span class="count-value">${count}</span>
      </div>
    ` as HTMLElement;

    container.appendChild(el);

    expect(container.querySelector("h1")?.textContent).toBe("Counter App");
    expect(container.querySelector(".count-value")?.textContent).toBe("10");

    // Mutate signals
    count.set(99);
    title.set("Updated Title");

    expect(container.querySelector("h1")?.textContent).toBe("Updated Title");
    expect(container.querySelector(".count-value")?.textContent).toBe("99");
  });

  it("binds reactive attributes and events in html tagged template", () => {
    const isDark = signal(false);
    let clicks = 0;

    const el = html`
      <button class="${() => (isDark() ? "theme-dark" : "theme-light")}" onClick="${() => clicks++}">
        Toggle
      </button>
    ` as HTMLElement;

    container.appendChild(el);
    const btn = container.querySelector("button")!;

    expect(btn.getAttribute("class")).toBe("theme-light");

    isDark.set(true);
    expect(btn.getAttribute("class")).toBe("theme-dark");

    btn.click();
    expect(clicks).toBe(1);
  });

  it("applies spread object props and attributes in html tagged template", () => {
    let clicked = false;
    const buttonProps = {
      id: "submit-action",
      "data-testid": "submit-btn",
      title: "Submit Form",
      onClick: () => {
        clicked = true;
      }
    };

    const el = html`
      <button ${buttonProps}>Confirm</button>
    ` as HTMLElement;

    container.appendChild(el);
    const btn = container.querySelector("#submit-action") as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute("data-testid")).toBe("submit-btn");
    expect(btn.getAttribute("title")).toBe("Submit Form");
    expect(btn.textContent).toBe("Confirm");

    btn.click();
    expect(clicked).toBe(true);
  });
});
