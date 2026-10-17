import { describe, expect, it } from "bun:test";
import * as t from "@babel/types";
import { type CompilerPlugin, compileJsx, createCompiler } from "../src/vite/compiler";

describe("Visage AOT JSX Compiler", () => {
  it("compiles static JSX elements into hoisted templates", () => {
    const input = `
      function Card() {
        return (
          <div class="card" id="main">
            <h1 class="title">Hello World</h1>
            <p>Welcome to Visage</p>
          </div>
        );
      }
    `;

    const { code } = compileJsx(input);

    expect(code).toContain("const _tmpl$1 = template(");
    expect(code).toContain(
      '<div class=\\"card\\" id=\\"main\\"><h1 class=\\"title\\">Hello World</h1><p>Welcome to Visage</p></div>'
    );
    expect(code).toContain("return _tmpl$1();");
  });

  it("escapes special characters in static JSX expression attributes", () => {
    const input = `
      function Banner() {
        return <div title={"Hello & \\"Goodbye\\""} data-count={42} />;
      }
    `;

    const { code } = compileJsx(input);
    expect(code).toContain('title=\\"Hello &amp; &quot;Goodbye&quot;\\"');
    expect(code).toContain('data-count=\\"42\\"');
  });

  it("inlines static style object expressions into HTML templates at compile time", () => {
    const input = `
      function Box() {
        return <div style={{ color: "red", fontSize: 16, marginTop: 8 }} />;
      }
    `;

    const { code } = compileJsx(input);
    expect(code).toContain('style=\\"color: red; font-size: 16px; margin-top: 8px\\"');
    // Verify it doesn't emit dynamic setAttribute
    expect(code).not.toContain('setAttribute(_el$, "style"');
  });

  it("inlines static class array and object expressions into HTML templates at compile time", () => {
    const input = `
      function Badges() {
        return (
          <div>
            <span class={["badge", "badge-pill", null, false]} />
            <span class={{ active: true, hidden: false, primary: true }} />
          </div>
        );
      }
    `;

    const { code } = compileJsx(input);
    expect(code).toContain('class=\\"badge badge-pill\\"');
    expect(code).toContain('class=\\"active primary\\"');
    expect(code).not.toContain("effect(");
  });

  it("omits static null and undefined attributes from template and dynamic attributes", () => {
    const input = `
      function Clean() {
        return <div title={null} id={undefined} disabled={false} />;
      }
    `;

    const { code } = compileJsx(input);
    expect(code).toContain('template("<div></div>")');
    expect(code).not.toContain("setAttribute");
  });

  it("normalizes JSX attribute aliases and handles static booleans and aria/data attributes", () => {
    const input = `
      function Form() {
        return (
          <div className="form-group" data-active={true} data-selected={false}>
            <label htmlFor="user-input" aria-hidden={false}>Username</label>
            <input id="user-input" disabled={true} readOnly={false} required />
          </div>
        );
      }
    `;

    const { code } = compileJsx(input);
    expect(code).toContain('class=\\"form-group\\"');
    expect(code).not.toContain("className");
    expect(code).toContain('for=\\"user-input\\"');
    expect(code).not.toContain("htmlFor");
    expect(code).toContain('data-active=\\"true\\"');
    expect(code).toContain('data-selected=\\"false\\"');
    expect(code).toContain('aria-hidden=\\"false\\"');
    expect(code).toContain("disabled");
    expect(code).toContain("required");
    expect(code).not.toContain("readOnly");
  });

  it("compiles dynamic event listeners with high-performance event delegation", () => {
    const input = `
      function Button() {
        return (
          <button class="btn btn-primary" onClick={handleClick}>
            Click Me
          </button>
        );
      }
    `;

    const { code } = compileJsx(input);

    expect(code).toContain('delegateEvents(["click"])');
    expect(code).toContain("const _tmpl$1 = template(");
    expect(code).toContain('<button class=\\"btn btn-primary\\">Click Me</button>');
    expect(code).toContain("_el$.__click = handleClick;");
    // Verify statements are inlined directly into the function body without IIFE wrapper
    expect(code).not.toContain("(() => {");
    expect(code).toContain("return _el$;");
  });

  it("compiles event delegation tuples [handler, data] into zero-allocation property assignments", () => {
    const input = `
      function ItemList() {
        return (
          <a class="lbl" onClick={[selectItem, item.id]}>
            {item.name}
          </a>
        );
      }
    `;

    const { code } = compileJsx(input);

    expect(code).toContain('delegateEvents(["click"])');
    expect(code).toContain('<a class=\\"lbl\\"> </a>');
    expect(code).toContain("_el$.__click = selectItem;");
    expect(code).toContain("_el$.__clickData = item.id;");
  });

  it("supports non-delegated events when delegateEvents is disabled or on capture", () => {
    const input = `
      function Button() {
        return (
          <button onClick={handleClick} onCaptureClick={handleCapture}>
            Click Me
          </button>
        );
      }
    `;

    const { code } = compileJsx(input, { delegateEvents: false });

    expect(code).toContain('_el$.addEventListener("click", handleClick);');
    expect(code).toContain('_el$.addEventListener("click", handleCapture, true);');
  });

  it("compiles reactive signal children and navigates DOM with firstChild/nextSibling", () => {
    const input = `
      function Counter() {
        return (
          <div class="counter">
            <span>Count:</span>
            <span>{count}</span>
            <button onClick={inc}>+</button>
          </div>
        );
      }
    `;

    const { code } = compileJsx(input);

    expect(code).toContain("const _tmpl$1 = template(");
    expect(code).toContain("insertChild");
    expect(code).toContain("firstChild");
    expect(code).toContain("nextSibling");
    expect(code).toContain("_node$2.__click = inc");
  });

  it("compiles custom components into function calls with props", () => {
    const input = `
      function App() {
        return (
          <div class="app">
            <Header title="My App" />
            <UI.Form.Input placeholder="Username" />
            <For each={items}>
              {(item) => <li>{item}</li>}
            </For>
          </div>
        );
      }
    `;

    const { code } = compileJsx(input);

    expect(code).toContain("Header({");
    expect(code).toContain('title: "My App"');
    expect(code).toContain("UI.Form.Input({");
    expect(code).toContain('placeholder: "Username"');
    expect(code).toContain("For({");
  });

  it("handles void HTML elements correctly without closing tags", () => {
    const input = `
      function Form() {
        return (
          <div>
            <input type="text" placeholder="Name" />
            <img src="/avatar.png" alt="Avatar" />
            <br />
          </div>
        );
      }
    `;

    const { code } = compileJsx(input);

    expect(code).toContain('<input type=\\"text\\" placeholder=\\"Name\\">');
    expect(code).toContain('<img src=\\"/avatar.png\\" alt=\\"Avatar\\">');
    expect(code).toContain("<br>");
    expect(code).not.toContain("</input>");
    expect(code).not.toContain("</img>");
  });

  it("handles table rows and cells properly", () => {
    const input = `
      function Row() {
        return (
          <tr class="danger">
            <td class="col-1">{id}</td>
            <td class="col-2"><a class="lbl">{label}</a></td>
          </tr>
        );
      }
    `;

    const { code } = compileJsx(input);

    expect(code).toContain("const _tmpl$1 = template(");
    expect(code).toContain('<tr class=\\"danger\\">');
    expect(code).toContain('<td class=\\"col-1\\">');
    expect(code).toContain('<td class=\\"col-2\\"><a class=\\"lbl\\">');
  });

  it("compiles two-way data bindings (bind:value and bind:checked)", () => {
    const input = `
      function Form() {
        return (
          <div>
            <input type="text" bind:value={text} />
            <input type="checkbox" bind:checked={agreed} />
          </div>
        );
      }
    `;

    const { code } = compileJsx(input);

    expect(code).toContain("_node$1.value = text()");
    expect(code).toContain('_node$1.addEventListener("input"');
    expect(code).toContain("text.set(e.target.value)");
    expect(code).toContain("_node$2.checked = agreed()");
    expect(code).toContain('_node$2.addEventListener("change"');
    expect(code).toContain("agreed.set(e.target.checked)");
  });

  it("supports JSX spreads on elements", () => {
    const input = `
      function Box() {
        return <div {...props}>Content</div>;
      }
    `;

    const { code } = compileJsx(input);

    expect(code).toContain(
      "Object.entries(props).forEach(([_k, _v]) => setAttribute(_el$, _k, _v));"
    );
  });

  it("compiles JSX fragments into array expressions", () => {
    const input = `
      function List() {
        return (
          <>
            <span>First</span>
            <span>Second</span>
          </>
        );
      }
    `;

    const { code } = compileJsx(input);

    expect(code).toContain("return [_tmpl$1(), _tmpl$2()];");
  });

  it("merges required helper imports into existing import declarations", () => {
    const input = `
      import { createSignal } from "visage";

      function App() {
        return <div onClick={handler}>{count}</div>;
      }
    `;

    const { code } = compileJsx(input);

    expect(code).toContain(
      'import { createSignal, template, delegateEvents, insertChild } from "visage";'
    );
    expect(code).toContain("const _tmpl$1 = template(");
  });

  it("supports custom compiler plugins for attributes and elements", () => {
    const customTooltipPlugin: CompilerPlugin = {
      name: "custom-tooltip",
      transformAttribute(ctx) {
        if (ctx.attrName === "tooltip") {
          return {
            statements: [
              t.expressionStatement(
                t.callExpression(t.identifier("setupTooltip"), [ctx.targetVar, ctx.valueExpr])
              )
            ]
          };
        }
      }
    };

    const compiler = createCompiler({
      plugins: [customTooltipPlugin]
    });

    const input = `
      function Info() {
        return <button tooltip={hint}>Info</button>;
      }
    `;

    const { code } = compiler.compile(input);

    expect(code).toContain("setupTooltip(_el$, hint);");
  });
});
