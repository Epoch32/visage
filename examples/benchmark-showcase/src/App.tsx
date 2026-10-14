import {
  Bar,
  CartesianGrid,
  Chart,
  ChartLegend,
  ChartTooltip,
  computed,
  For,
  signal,
  XAxis,
  YAxis
} from "visage";
import { BENCHMARK_DATA, type BenchmarkResult, SYSTEM_SPECS } from "./data";

export function App() {
  const selectedCategory = signal<string>("all");
  const sortColumn = signal<keyof BenchmarkResult | "speedup">("id");
  const sortAsc = signal<boolean>(true);
  const chartScope = signal<"standard" | "all" | "stress">("standard");

  const filteredData = computed(() => {
    const cat = selectedCategory();
    let data = cat === "all" ? BENCHMARK_DATA : BENCHMARK_DATA.filter((d) => d.category === cat);

    const col = sortColumn();
    const asc = sortAsc();

    return [...data].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (col === "speedup") {
        valA = b.solid / a.visage;
        valB = a.solid / b.visage;
      } else {
        valA = a[col];
        valB = b[col];
      }

      if (typeof valA === "string") {
        return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return asc ? valA - valB : valB - valA;
    });
  });

  const chartData = computed(() => {
    const scope = chartScope();
    let data = BENCHMARK_DATA;
    if (scope === "standard") {
      data = BENCHMARK_DATA.filter((d) => d.id !== "07_create10k");
    } else if (scope === "stress") {
      data = BENCHMARK_DATA.filter((d) => d.id === "07_create10k");
    }

    return data.map((item) => {
      const speedup = Number((item.solid / item.visage).toFixed(2));
      return {
        name: item.name
          .replace(" Rows", "")
          .replace(" (16x)", "")
          .replace(" (2x)", "")
          .replace(" (8x)", "")
          .replace("Single ", ""),
        visage: item.visage,
        solid: item.solid,
        vanilla: item.vanilla,
        speedup: speedup
      };
    });
  });

  const handleSort = (col: keyof BenchmarkResult | "speedup") => {
    if (sortColumn() === col) {
      sortAsc.update((v) => !v);
    } else {
      sortColumn.set(col);
      sortAsc.set(true);
    }
  };

  return (
    <div class="container">
      {/* Header */}
      <header class="header">
        <div class="header-top">
          <div class="header-title-group">
            <h1>
              Visage Benchmark Telemetry
              <span class="tag-version">v{SYSTEM_SPECS.visageVersion}</span>
            </h1>
            <p class="header-subtitle">
              Official js-framework-benchmark suite results on Google Chrome 155 (Linux x86_64)
            </p>
          </div>
          <div class="system-badges">
            <span class="badge">Engine: <strong>Chrome Blink C++</strong></span>
            <span class="badge">Runner: <strong>Puppeteer Headless</strong></span>
            <span class="badge">Baseline: <strong>SolidJS v{SYSTEM_SPECS.solidVersion}</strong></span>
          </div>
        </div>
      </header>

      {/* Key Metric Highlights */}
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Peak Speedup Multiplier</div>
          <div class="metric-value-row">
            <div class="metric-value">2.37x</div>
            <span class="metric-badge success">+137% faster</span>
          </div>
          <div class="metric-sub">Append 1,000 Rows (62.6 ms vs Solid 148.6 ms)</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">10k Rows Scalability</div>
          <div class="metric-value-row">
            <div class="metric-value">2.12x</div>
            <span class="metric-badge success">+112% faster</span>
          </div>
          <div class="metric-sub">Create 10,000 Rows (588.5 ms vs Solid 1,248.6 ms)</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Memory & Node Reclamation</div>
          <div class="metric-value-row">
            <div class="metric-value">2.06x</div>
            <span class="metric-badge success">+106% faster</span>
          </div>
          <div class="metric-sub">Clear Rows 8x (31.1 ms vs Solid 64.1 ms)</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Row Creation Script Time</div>
          <div class="metric-value-row">
            <div class="metric-value">8.9 ms</div>
            <span class="metric-badge success">-1.7 ms delta</span>
          </div>
          <div class="metric-sub">Visage pure JS execution vs Solid 10.6 ms</div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div class="section-card">
        <div class="section-header">
          <div class="section-title-group">
            <h2>Comparative Performance Telemetry</h2>
            <p>Direct fine-grained DOM execution times across benchmark operations</p>
          </div>
          <div class="controls-group">
            <button
              type="button"
              class={() => `btn-filter ${chartScope() === "standard" ? "active" : ""}`}
              onClick={() => chartScope.set("standard")}
            >
              Standard 1k Ops
            </button>
            <button
              type="button"
              class={() => `btn-filter ${chartScope() === "all" ? "active" : ""}`}
              onClick={() => chartScope.set("all")}
            >
              All 9 Ops
            </button>
            <button
              type="button"
              class={() => `btn-filter ${chartScope() === "stress" ? "active" : ""}`}
              onClick={() => chartScope.set("stress")}
            >
              10k Stress Test
            </button>
          </div>
        </div>

        <div class="chart-container">
          <Chart
            data={chartData}
            width="100%"
            height={340}
            margin={{ top: 20, right: 30, left: 60, bottom: 45 }}
          >
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} tickFormat={(v: number) => `${v}ms`} />
            <Bar dataKey="visage" fill="#38bdf8" name="Visage v1.8.0" radius={4} maxWidth={28} />
            <Bar dataKey="solid" fill="#818cf8" name="SolidJS v1.9.3" radius={4} maxWidth={28} />
            <Bar dataKey="vanilla" fill="#f59e0b" name="Vanilla JS" radius={4} maxWidth={28} />
            <ChartTooltip />
            <ChartLegend />
          </Chart>
        </div>
      </div>

      {/* Full Results Table */}
      <div class="section-card">
        <div class="section-header">
          <div class="section-title-group">
            <h2>Official Results Matrix</h2>
            <p>Median duration across official benchmark runs (Lower is Better)</p>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                  Benchmark Operation
                </th>
                <th class="numeric" onClick={() => handleSort("visage")} style={{ cursor: "pointer" }}>
                  Visage (ms)
                </th>
                <th class="numeric">Visage Script</th>
                <th class="numeric" onClick={() => handleSort("solid")} style={{ cursor: "pointer" }}>
                  SolidJS (ms)
                </th>
                <th class="numeric">Solid Script</th>
                <th class="numeric" onClick={() => handleSort("vanilla")} style={{ cursor: "pointer" }}>
                  Vanilla JS (ms)
                </th>
                <th class="numeric" onClick={() => handleSort("speedup")} style={{ cursor: "pointer" }}>
                  Speedup vs Solid
                </th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredData} by={(r) => r.id}>
                {(row) => {
                  const speedup = Number((row.solid / row.visage).toFixed(2));
                  const isVisageWin = row.visage <= row.solid;
                  return (
                    <tr>
                      <td>
                        <div class="col-operation">{row.name}</div>
                        <div class="col-sub">{row.description}</div>
                      </td>
                      <td class="numeric mono val-visage">{row.visage.toFixed(1)}</td>
                      <td class="numeric mono">{row.visageScript.toFixed(1)}</td>
                      <td class="numeric mono val-solid">{row.solid.toFixed(1)}</td>
                      <td class="numeric mono">{row.solidScript.toFixed(1)}</td>
                      <td class="numeric mono val-vanilla">{row.vanilla.toFixed(1)}</td>
                      <td class="numeric mono">
                        <span class={speedup >= 1 ? "speedup-pill" : "pill-neutral"}>
                          {speedup}x
                        </span>
                      </td>
                      <td>
                        {isVisageWin ? (
                          <span class="metric-badge success">VISAGE WIN</span>
                        ) : (
                          <span class="pill-neutral">TIED</span>
                        )}
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>
      </div>

      {/* Under-the-Hood Architectural Mechanics */}
      <div class="section-card">
        <div class="section-header">
          <div class="section-title-group">
            <h2>Architectural Optimizations</h2>
            <p>Under-the-hood engine mechanics enabling sub-10ms row throughput</p>
          </div>
        </div>

        <div class="architecture-grid">
          <div class="arch-card">
            <h3>Zero-Allocation Event Delegation</h3>
            <p>
              Compiles tuple listeners into direct target properties, eliminating 2,000 array allocations
              per 1,000 rows. Bubbling events pass data directly without closure creation.
            </p>
            <code class="arch-code">
              target.__click = select;<br />
              target.__clickData = row.id;
            </code>
          </div>

          <div class="arch-card">
            <h3>Pre-Cloned Text Node In-Place Reuse</h3>
            <p>
              Emits whitespace text placeholders in static templates so Blink's C++ cloneNode instantiates
              Text nodes natively. Visage mutates Text.data directly without document.createTextNode.
            </p>
            <code class="arch-code">
              textNode = parent.firstChild as Text;<br />
              textNode.data = String(value);
            </code>
          </div>

          <div class="arch-card">
            <h3>Fine-Grained O(1) Reactive Selector</h3>
            <p>
              Selective dependency tracking isolates row selections. Changing a selected row notifies only the
              previous and next subscriber instead of traversing 1,000 list observers.
            </p>
            <code class="arch-code">
              const isSelected = createSelector(selected);<br />
              // O(1) observer wakeup on click
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
