import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { App } from "../benchmarks/keyed/src/main";
import { render } from "../src/dom/render";

describe("Visage Official Keyed Benchmark Suite", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "main";
    document.body.appendChild(container);
    render(() => App(), container);
  });

  it("renders the initial benchmark shell with required buttons and empty table", () => {
    expect(container.querySelector("#run")).toBeTruthy();
    expect(container.querySelector("#runlots")).toBeTruthy();
    expect(container.querySelector("#add")).toBeTruthy();
    expect(container.querySelector("#update")).toBeTruthy();
    expect(container.querySelector("#clear")).toBeTruthy();
    expect(container.querySelector("#swaprows")).toBeTruthy();

    const tbody = container.querySelector("#tbody");
    expect(tbody).toBeTruthy();
    expect(tbody?.children.length).toBe(0);
  });

  it("creates 1,000 rows on #run click", () => {
    const runBtn = container.querySelector("#run") as HTMLButtonElement;
    const t0 = performance.now();
    runBtn.click();
    const t1 = performance.now();

    const tbody = container.querySelector("#tbody")!;
    expect(tbody.children.length).toBe(1000);

    const firstRow = tbody.children[0] as HTMLTableRowElement;
    expect(firstRow.querySelector(".col-md-1")?.textContent).toBeTruthy();
    expect(firstRow.querySelector(".lbl")?.textContent).toBeTruthy();
    expect(t1 - t0 < 1000).toBe(true);
  });

  it("replaces 1,000 rows when clicking #run repeatedly", () => {
    const runBtn = container.querySelector("#run") as HTMLButtonElement;
    runBtn.click();
    const tbody = container.querySelector("#tbody")!;
    const firstRowId1 = tbody.children[0]?.querySelector(".col-md-1")?.textContent;

    runBtn.click();
    expect(tbody.children.length).toBe(1000);
    const firstRowId2 = tbody.children[0]?.querySelector(".col-md-1")?.textContent;
    expect(firstRowId1).not.toBe(firstRowId2);
  });

  it("updates every 10th row with ' !!!' on #update click", () => {
    const runBtn = container.querySelector("#run") as HTMLButtonElement;
    runBtn.click();

    const tbody = container.querySelector("#tbody")!;
    const label0Before = tbody.children[0]?.querySelector(".lbl")?.textContent ?? "";
    const label1Before = tbody.children[1]?.querySelector(".lbl")?.textContent ?? "";
    const label10Before = tbody.children[10]?.querySelector(".lbl")?.textContent ?? "";

    const updateBtn = container.querySelector("#update") as HTMLButtonElement;
    updateBtn.click();

    const label0After = tbody.children[0]?.querySelector(".lbl")?.textContent ?? "";
    const label1After = tbody.children[1]?.querySelector(".lbl")?.textContent ?? "";
    const label10After = tbody.children[10]?.querySelector(".lbl")?.textContent ?? "";

    expect(label0After).toBe(`${label0Before} !!!`);
    expect(label1After).toBe(label1Before); // untouched
    expect(label10After).toBe(`${label10Before} !!!`);
  });

  it("selects row on label click and updates only target rows via createSelector", () => {
    const runBtn = container.querySelector("#run") as HTMLButtonElement;
    runBtn.click();

    const tbody = container.querySelector("#tbody")!;
    const row2 = tbody.children[2] as HTMLTableRowElement;
    const row5 = tbody.children[5] as HTMLTableRowElement;

    expect(row2.classList.contains("danger")).toBe(false);
    expect(row5.classList.contains("danger")).toBe(false);

    // Select row 2
    (row2.querySelector(".lbl") as HTMLAnchorElement).click();
    expect(row2.classList.contains("danger")).toBe(true);
    expect(row5.classList.contains("danger")).toBe(false);

    // Switch selection to row 5
    (row5.querySelector(".lbl") as HTMLAnchorElement).click();
    expect(row2.classList.contains("danger")).toBe(false);
    expect(row5.classList.contains("danger")).toBe(true);
  });

  it("swaps rows 1 and 998 on #swaprows click", () => {
    const runBtn = container.querySelector("#run") as HTMLButtonElement;
    runBtn.click();

    const tbody = container.querySelector("#tbody")!;
    const row1Id = tbody.children[1]?.querySelector(".col-md-1")?.textContent;
    const row998Id = tbody.children[998]?.querySelector(".col-md-1")?.textContent;

    const swapBtn = container.querySelector("#swaprows") as HTMLButtonElement;
    swapBtn.click();

    expect(tbody.children[1]?.querySelector(".col-md-1")?.textContent).toBe(row998Id);
    expect(tbody.children[998]?.querySelector(".col-md-1")?.textContent).toBe(row1Id);
  });

  it("removes single row on delete button click", () => {
    const runBtn = container.querySelector("#run") as HTMLButtonElement;
    runBtn.click();

    const tbody = container.querySelector("#tbody")!;
    expect(tbody.children.length).toBe(1000);

    const targetRowId = tbody.children[5]?.querySelector(".col-md-1")?.textContent;
    const removeBtn = tbody.children[5]?.querySelector(".remove") as HTMLAnchorElement;
    removeBtn.click();

    expect(tbody.children.length).toBe(999);
    // Verify target row is gone
    const newRow5Id = tbody.children[5]?.querySelector(".col-md-1")?.textContent;
    expect(newRow5Id).not.toBe(targetRowId);
  });

  it("appends 1,000 rows on #add click", () => {
    const runBtn = container.querySelector("#run") as HTMLButtonElement;
    runBtn.click();
    const tbody = container.querySelector("#tbody")!;
    expect(tbody.children.length).toBe(1000);

    const addBtn = container.querySelector("#add") as HTMLButtonElement;
    addBtn.click();
    expect(tbody.children.length).toBe(2000);
  });

  it("clears rows on #clear click", () => {
    const runBtn = container.querySelector("#run") as HTMLButtonElement;
    runBtn.click();
    const tbody = container.querySelector("#tbody")!;
    expect(tbody.children.length).toBe(1000);

    const clearBtn = container.querySelector("#clear") as HTMLButtonElement;
    clearBtn.click();
    expect(tbody.children.length).toBe(0);
  });

  it("creates and rapidly clears 10,000 rows on #runlots and #clear click", () => {
    const runLotsBtn = container.querySelector("#runlots") as HTMLButtonElement;
    const clearBtn = container.querySelector("#clear") as HTMLButtonElement;
    const tbody = container.querySelector("#tbody")!;

    runLotsBtn.click();
    expect(tbody.children.length).toBe(10000);

    clearBtn.click();
    expect(tbody.children.length).toBe(0);
  });
});
