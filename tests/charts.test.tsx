import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import {
  Area,
  Bar,
  CartesianGrid,
  Chart,
  ChartCursor,
  ChartLegend,
  ChartTooltip,
  createBandScale,
  createLinearScale,
  generateNiceTicks,
  Line,
  Pie,
  pathArc,
  pathArea,
  pathLine,
  render,
  renderToString,
  signal,
  XAxis,
  YAxis
} from "../src";

describe("Visage Charts (visage/charts)", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("Mathematical Scales & Path Generators", () => {
    it("generates nice human-friendly tick values", () => {
      const ticks = generateNiceTicks(0, 100, 5);
      expect(ticks.length > 2).toBe(true);
      expect(ticks[0]).toBe(0);
      expect(ticks[ticks.length - 1]).toBe(100);
      expect(ticks).toContain(60);
    });

    it("maps linear scale domain to range and inverts correctly", () => {
      const scale = createLinearScale([0, 100], [0, 500]);
      expect(scale(0)).toBe(0);
      expect(scale(50)).toBe(250);
      expect(scale(100)).toBe(500);
      expect(scale.invert(250)).toBe(50);
    });

    it("calculates band scale slots and bandwidth", () => {
      const scale = createBandScale(["Jan", "Feb", "Mar", "Apr"], [0, 400]);
      expect(scale.domain.length).toBe(4);
      expect(scale.bandwidth() > 0).toBe(true);
      expect(scale("Jan") < scale("Feb")).toBe(true);
      expect(scale("Feb") < scale("Mar")).toBe(true);
    });

    it("correctly maps numeric categorical domain items without index collision", () => {
      // Domain with numbers in reverse order
      const scale = createBandScale([3, 2, 1], [0, 300]);
      expect(scale(3) < scale(2)).toBe(true);
      expect(scale(2) < scale(1)).toBe(true);

      // Domain with years
      const yearScale = createBandScale([2020, 2021, 2022], [0, 300]);
      expect(yearScale(2020) < yearScale(2021)).toBe(true);
      expect(yearScale(2021) < yearScale(2022)).toBe(true);
    });

    it("generates linear and smooth SVG path coordinates", () => {
      const points = [
        { x: 0, y: 100 },
        { x: 50, y: 50 },
        { x: 100, y: 80 }
      ];

      const linearD = pathLine(points, { curve: "linear" });
      expect(linearD).toContain("M 0.00,100.00");
      expect(linearD).toContain("L 50.00,50.00");

      const smoothD = pathLine(points, { curve: "smooth" });
      expect(smoothD).toContain("M 0.00,100.00");
      expect(smoothD).toContain("C ");

      const areaD = pathArea(points, 200, { curve: "smooth" });
      expect(areaD).toContain("Z");
      expect(areaD).toContain("200.00");
    });

    it("generates arc paths for pie and donut slices", () => {
      const pieD = pathArc({
        cx: 100,
        cy: 100,
        innerRadius: 0,
        outerRadius: 80,
        startAngle: 0,
        endAngle: Math.PI / 2
      });
      expect(pieD).toContain("M 100.00,100.00");
      expect(pieD).toContain("A 80.00,80.00");

      const donutD = pathArc({
        cx: 100,
        cy: 100,
        innerRadius: 40,
        outerRadius: 80,
        startAngle: 0,
        endAngle: Math.PI / 2
      });
      expect(donutD).toContain("A 80.00,80.00");
      expect(donutD).toContain("A 40.00,40.00");

      // Full 100% (2π) pie slice splits into two arcs
      const fullPieD = pathArc({
        cx: 100,
        cy: 100,
        innerRadius: 0,
        outerRadius: 80,
        startAngle: 0,
        endAngle: 2 * Math.PI
      });
      // Contains two arc commands so identical start/end point does not cause SVG arc to vanish
      const arcMatches = fullPieD.match(/A 80\.00,80\.00/g);
      expect(arcMatches?.length).toBe(2);

      // Full 100% (2π) donut slice
      const fullDonutD = pathArc({
        cx: 100,
        cy: 100,
        innerRadius: 40,
        outerRadius: 80,
        startAngle: 0,
        endAngle: 2 * Math.PI
      });
      expect(fullDonutD.match(/A 80\.00,80\.00/g)?.length).toBe(2);
      expect(fullDonutD.match(/A 40\.00,40\.00/g)?.length).toBe(2);
    });
  });

  describe("<Chart> Component Tree & SVG Rendering", () => {
    it("renders line chart with axes and grid", () => {
      const data = [
        { month: "Jan", sales: 100 },
        { month: "Feb", sales: 150 },
        { month: "Mar", sales: 200 }
      ];

      render(() => {
        return (
          <Chart data={data} width={500} height={300}>
            <CartesianGrid horizontal={true} />
            <XAxis dataKey="month" />
            <YAxis />
            <Line dataKey="sales" stroke="#8b5cf6" dot={true} />
          </Chart>
        );
      }, container);

      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();

      const grid = container.querySelector(".visage-cartesian-grid");
      expect(grid).not.toBeNull();

      const xAxis = container.querySelector(".visage-x-axis");
      expect(xAxis).not.toBeNull();
      expect(xAxis?.textContent).toContain("Jan");

      const yAxis = container.querySelector(".visage-y-axis");
      expect(yAxis).not.toBeNull();

      const lineGroup = container.querySelector(".visage-line-sales");
      expect(lineGroup).not.toBeNull();

      const path = lineGroup?.querySelector("path");
      expect(path).not.toBeNull();
      expect(path?.getAttribute("d")).toContain("M ");

      // Dot circles
      const circles = lineGroup?.querySelectorAll("circle");
      expect(circles?.length).toBe(3);
    });

    it("renders area chart with closed polygon and fill", () => {
      const data = [
        { time: "00:00", load: 20 },
        { time: "01:00", load: 45 },
        { time: "02:00", load: 80 }
      ];

      render(() => {
        return (
          <Chart data={data} width={400} height={250}>
            <Area dataKey="load" stroke="#ec4899" fill="rgba(236, 72, 153, 0.2)" />
          </Chart>
        );
      }, container);

      const areaGroup = container.querySelector(".visage-area-load");
      expect(areaGroup).not.toBeNull();

      const paths = areaGroup?.querySelectorAll("path");
      expect(paths?.length).toBe(2); // One filled area, one stroke line
      expect(paths?.[0]?.getAttribute("fill")).toBe("rgba(236, 72, 153, 0.2)");
      expect(paths?.[0]?.getAttribute("d")).toContain("Z");
    });

    it("renders bar chart with scaled rectangles", () => {
      const data = [
        { category: "A", val: 30 },
        { category: "B", val: 60 }
      ];

      render(() => {
        return (
          <Chart data={data} width={300} height={200}>
            <XAxis dataKey="category" />
            <Bar dataKey="val" fill="#10b981" radius={4} />
          </Chart>
        );
      }, container);

      const barGroup = container.querySelector(".visage-bar-val");
      expect(barGroup).not.toBeNull();

      const rects = barGroup?.querySelectorAll("rect");
      expect(rects?.length).toBe(2);
      expect(rects?.[0]?.getAttribute("fill")).toBe("#10b981");
      expect(rects?.[0]?.getAttribute("rx")).toBe("4");
    });

    it("renders pie and donut chart slices", () => {
      const data = [
        { name: "Alpha", val: 40 },
        { name: "Beta", val: 60 }
      ];

      render(() => {
        return (
          <Chart data={data} width={300} height={300}>
            <Pie dataKey="val" innerRadius={40} outerRadius={80} />
          </Chart>
        );
      }, container);

      const pieGroup = container.querySelector(".visage-pie");
      expect(pieGroup).not.toBeNull();

      const slices = pieGroup?.querySelectorAll("path");
      expect(slices?.length).toBe(2);
    });

    it("reactively updates chart paths when data signal changes", () => {
      const data = signal([
        { step: "1", metric: 10 },
        { step: "2", metric: 20 }
      ]);

      render(() => {
        return (
          <Chart data={data} width={300} height={200}>
            <Line dataKey="metric" />
          </Chart>
        );
      }, container);

      const lineGroup = container.querySelector(".visage-line-metric");
      const path = lineGroup?.querySelector("path");
      const initialD = path?.getAttribute("d");

      // Update signal
      data.set([
        { step: "1", metric: 50 },
        { step: "2", metric: 90 }
      ]);

      const updatedD = lineGroup?.querySelector("path")?.getAttribute("d");
      expect(updatedD).not.toBe(initialD);
    });

    it("handles cursor scrub events and renders tooltip", () => {
      const data = [
        { x: "A", score: 100 },
        { x: "B", score: 200 }
      ];

      render(() => {
        return (
          <Chart data={data} width={400} height={300}>
            <XAxis dataKey="x" />
            <Line dataKey="score" />
            <ChartCursor />
            <ChartTooltip />
          </Chart>
        );
      }, container);

      const chartWrapper = container.firstElementChild as HTMLElement;
      expect(chartWrapper).not.toBeNull();

      // Trigger pointer event
      chartWrapper.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 200, clientY: 150, bubbles: true })
      );

      // Verify ChartCursor rendered
      const cursorLine = container.querySelector(".visage-chart-cursor line");
      expect(cursorLine).not.toBeNull();
    });

    it("renders chart legend without duplicate items across series", () => {
      const data = [
        { cat: "A", s1: 10, s2: 20 },
        { cat: "B", s1: 30, s2: 40 }
      ];

      render(() => {
        return (
          <Chart data={data} width={400} height={300}>
            <XAxis dataKey="cat" />
            <Bar dataKey="s1" name="Series One" />
            <Bar dataKey="s2" name="Series Two" />
            <ChartLegend />
          </Chart>
        );
      }, container);

      const legend = container.querySelector('div[style*="justify-content"]');
      expect(legend).not.toBeNull();

      const labels = Array.from(legend?.querySelectorAll("span") || [])
        .map((s) => s.textContent?.trim())
        .filter(Boolean);

      expect(labels).toEqual(["Series One", "Series Two"]);
    });

    it("renders chart tooltip without duplicate series items", () => {
      const data = [{ cat: "Alpha", s1: 100, s2: 200 }];

      render(() => {
        return (
          <Chart data={data} width={400} height={300}>
            <Bar dataKey="s1" name="Metric A" />
            <Bar dataKey="s2" name="Metric B" />
            <ChartTooltip />
          </Chart>
        );
      }, container);

      const chartWrapper = container.firstElementChild as HTMLElement;
      chartWrapper.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 100, clientY: 100, bubbles: true })
      );

      const tooltipItems = Array.from(
        container.querySelectorAll('div[style*="justify-content: space-between"] span')
      )
        .map((s) => s.textContent?.trim())
        .filter(Boolean);

      expect(tooltipItems).toEqual(["Metric A", "100", "Metric B", "200"]);
    });
  });

  describe("SSR Integration", () => {
    it("renders chart component tree to static SVG HTML string", () => {
      const data = [
        { date: "2026-01", visitors: 1200 },
        { date: "2026-02", visitors: 1900 }
      ];

      const html = renderToString(() => (
        <Chart data={data} width={600} height={300}>
          <CartesianGrid />
          <XAxis dataKey="date" />
          <YAxis />
          <Line dataKey="visitors" stroke="#8b5cf6" />
        </Chart>
      ));

      expect(html).toContain("<svg");
      expect(html).toContain("visage-cartesian-grid");
      expect(html).toContain("visage-x-axis");
      expect(html).toContain("visage-y-axis");
      expect(html).toContain("visage-line-visitors");
      expect(html).toContain("</svg>");
    });
  });
});
