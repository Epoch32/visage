import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();
import {
  Center,
  createRoot,
  fluid,
  glass,
  Grid,
  px,
  radius,
  rem,
  render,
  renderToString,
  Row,
  shadow,
  signal,
  space,
  Spacer,
  Stack
} from "../src";

describe("Visage Spatial Engine & Layout Primitives", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("Spatial Scale & Unit Resolvers", () => {
    it("resolves numbers to 4px engineering grid measurements", () => {
      expect(space(0)).toBe("0px");
      expect(space(1)).toBe("4px");
      expect(space(2)).toBe("8px");
      expect(space(3)).toBe("12px");
      expect(space(4)).toBe("16px");
      expect(space(6)).toBe("24px");
      expect(space(8)).toBe("32px");
      expect(space(16)).toBe("64px");
    });

    it("resolves semantic dimension intent keywords", () => {
      expect(space("screen")).toBe("100dvh");
      expect(space("screen-w")).toBe("100dvw");
      expect(space("full")).toBe("100%");
      expect(space("half")).toBe("50%");
      expect(space("auto")).toBe("auto");
      expect(space("min")).toBe("min-content");
      expect(space("max")).toBe("max-content");
      expect(space("fit")).toBe("fit-content");
    });

    it("preserves explicit units and raw helpers", () => {
      expect(space("20px")).toBe("20px");
      expect(space("1.5rem")).toBe("1.5rem");
      expect(px(15)).toBe("15px");
      expect(rem(2)).toBe("2rem");
    });

    it("generates fluid linear interpolation clamp formulas", () => {
      const clampVal = fluid(16, 32);
      expect(clampVal).toContain("clamp(16px");
      expect(clampVal).toContain("32px)");
      expect(clampVal).toContain("vw");
    });

    it("resolves optical depth shadows and radius tokens", () => {
      expect(shadow("sm")).toBe("0 1px 2px 0 rgba(0, 0, 0, 0.05)");
      expect(shadow("soft")).toBe("0 8px 30px rgba(0, 0, 0, 0.06)");
      expect(radius("sm")).toBe("4px");
      expect(radius("full")).toBe("9999px");
      expect(radius(12)).toBe("12px");
    });

    it("generates tactile glassmorphism style attributes", () => {
      const glassStyle = glass({ blur: 24, tint: "rgba(255, 255, 255, 0.6)" });
      expect(glassStyle.backdropFilter).toBe("blur(24px)");
      expect(glassStyle.backgroundColor).toBe("rgba(255, 255, 255, 0.6)");
    });
  });

  describe("Fine-Grained Signal-to-Style Binding", () => {
    it("binds reactive numeric signals directly to CSS length properties with auto-unit resolution", () => {
      const width = signal(120);
      const opacity = signal(0.75);

      render(() => {
        return <div id="box" style={{ width, opacity }} />;
      }, container);

      const el = container.querySelector("#box") as HTMLElement;
      expect(el).not.toBeNull();
      expect(el.style.width).toBe("120px");
      expect(el.style.opacity).toBe("0.75");

      // Update signal reactively
      width.set(240);
      opacity.set(1);

      expect(el.style.width).toBe("240px");
      expect(el.style.opacity).toBe("1");
    });

    it("resolves dimension keywords in style objects", () => {
      render(() => {
        return <div id="viewport-box" style={{ height: "screen", width: "full" }} />;
      }, container);

      const el = container.querySelector("#viewport-box") as HTMLElement;
      expect(el.style.height).toBe("100dvh");
      expect(el.style.width).toBe("100%");
    });
  });

  describe("<Stack> Component", () => {
    it("renders vertical column flex with spatial gap and alignments", () => {
      render(() => {
        return (
          <Stack id="stack" gap={4} align="center" justify="between" p={6}>
            <span>Item 1</span>
            <span>Item 2</span>
          </Stack>
        );
      }, container);

      const el = container.querySelector("#stack") as HTMLElement;
      expect(el).not.toBeNull();
      expect(el.style.display).toBe("flex");
      expect(el.style.flexDirection).toBe("column");
      expect(el.style.gap).toBe("16px");
      expect(el.style.alignItems).toBe("center");
      expect(el.style.justifyContent).toBe("space-between");
      expect(el.style.padding).toBe("24px");
      expect(el.children.length).toBe(2);
    });

    it("supports horizontal and reversed directions", () => {
      render(() => {
        return (
          <Stack id="rev-stack" direction="horizontal" reversed={true}>
            <span>Item</span>
          </Stack>
        );
      }, container);

      const el = container.querySelector("#rev-stack") as HTMLElement;
      expect(el.style.flexDirection).toBe("row-reverse");
    });
  });

  describe("<Row> Component", () => {
    it("renders horizontal flex row with align=center by default", () => {
      render(() => {
        return (
          <Row id="row" gap={3} justify="between">
            <span>Left</span>
            <span>Right</span>
          </Row>
        );
      }, container);

      const el = container.querySelector("#row") as HTMLElement;
      expect(el).not.toBeNull();
      expect(el.style.display).toBe("flex");
      expect(el.style.flexDirection).toBe("row");
      expect(el.style.alignItems).toBe("center");
      expect(el.style.gap).toBe("12px");
      expect(el.style.justifyContent).toBe("space-between");
    });
  });

  describe("<Center> Component", () => {
    it("centers content horizontally and vertically without margin hacks", () => {
      render(() => {
        return (
          <Center id="center-box" h="screen">
            <span>Centered Text</span>
          </Center>
        );
      }, container);

      const el = container.querySelector("#center-box") as HTMLElement;
      expect(el.style.display).toBe("flex");
      expect(el.style.alignItems).toBe("center");
      expect(el.style.justifyContent).toBe("center");
      expect(el.style.height).toBe("100dvh");
    });
  });

  describe("<Grid> Component", () => {
    it("renders fixed column repeat rules", () => {
      render(() => {
        return (
          <Grid id="grid-3" columns={3} gap={4}>
            <div>Col 1</div>
            <div>Col 2</div>
            <div>Col 3</div>
          </Grid>
        );
      }, container);

      const el = container.querySelector("#grid-3") as HTMLElement;
      expect(el.style.display).toBe("grid");
      expect(el.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
      expect(el.style.gap).toBe("16px");
    });

    it("renders auto-fit responsive grid using minChildWidth", () => {
      render(() => {
        return (
          <Grid id="fluid-grid" minChildWidth={250} gap={6}>
            <div>Card A</div>
            <div>Card B</div>
          </Grid>
        );
      }, container);

      const el = container.querySelector("#fluid-grid") as HTMLElement;
      expect(el.style.display).toBe("grid");
      expect(el.style.gridTemplateColumns).toContain("repeat(auto-fit, minmax(min(100%, 250px), 1fr))");
      expect(el.style.gap).toBe("24px");
    });
  });

  describe("<Spacer> Component", () => {
    it("renders flex spacer expanding to fill available space", () => {
      render(() => {
        return (
          <Row>
            <span>Start</span>
            <Spacer id="push-space" />
            <span>End</span>
          </Row>
        );
      }, container);

      const el = container.querySelector("#push-space") as HTMLElement;
      expect(el.style.flex).toContain("1");
    });

    it("renders fixed dimensional spacer when size is provided", () => {
      render(() => {
        return (
          <Stack>
            <span>Top</span>
            <Spacer id="fixed-space" size={5} />
            <span>Bottom</span>
          </Stack>
        );
      }, container);

      const el = container.querySelector("#fixed-space") as HTMLElement;
      expect(el.style.width).toBe("20px");
      expect(el.style.height).toBe("20px");
      expect(el.style.flexShrink).toBe("0");
    });
  });

  describe("SSR Integration", () => {
    it("renders layout primitives and spatial styles to HTML string", () => {
      const html = renderToString(() => (
        <Stack gap={4} p={6} class="my-stack">
          <Row gap={2}>
            <span>Title</span>
            <Spacer />
            <span>Badge</span>
          </Row>
        </Stack>
      ));

      expect(html).toContain("display: flex");
      expect(html).toContain("flex-direction: column");
      expect(html).toContain("gap: 16px");
      expect(html).toContain("padding: 24px");
      expect(html).toContain("my-stack");
      expect(html).toContain("Title");
      expect(html).toContain("Badge");
    });
  });
});
