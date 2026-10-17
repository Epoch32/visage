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
