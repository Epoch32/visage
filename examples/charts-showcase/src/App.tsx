import {
  Area,
  Bar,
  CartesianGrid,
  Chart,
  ChartCursor,
  ChartLegend,
  ChartTooltip,
  Line,
  onCleanup,
  Pie,
  signal,
  XAxis,
  YAxis
} from "visage";

// Initial seed for live streaming throughput
function generateStreamWindow() {
  const points = [];
  const now = Date.now();
  for (let i = 14; i >= 0; i--) {
    const t = new Date(now - i * 1000);
    const timeStr = `${t.getMinutes().toString().padStart(2, "0")}:${t.getSeconds().toString().padStart(2, "0")}`;
    points.push({
      time: timeStr,
      throughput: Math.floor(320 + Math.random() * 180),
      memory: Math.floor(210 + Math.random() * 70)
    });
  }
  return points;
}

const INITIAL_FINANCIALS = [
  { quarter: "Q1 '25", revenue: 84, expenses: 54 },
  { quarter: "Q2 '25", revenue: 112, expenses: 68 },
  { quarter: "Q3 '25", revenue: 98, expenses: 62 },
  { quarter: "Q4 '25", revenue: 145, expenses: 82 },
  { quarter: "Q1 '26", revenue: 168, expenses: 94 }
];

const INITIAL_TRAFFIC = [
  { source: "Direct", share: 42, color: "#8b5cf6" },
  { source: "Search", share: 30, color: "#3b82f6" },
  { source: "Social", share: 18, color: "#10b981" },
  { source: "Referral", share: 10, color: "#f59e0b" }
];

const LATENCY_SERIES = [
  { hour: "00:00", p50: 18, p99: 45 },
  { hour: "03:00", p50: 14, p99: 38 },
  { hour: "06:00", p50: 22, p99: 58 },
  { hour: "09:00", p50: 38, p99: 92 },
  { hour: "12:00", p50: 45, p99: 118 },
  { hour: "15:00", p50: 41, p99: 105 },
  { hour: "18:00", p50: 32, p99: 76 },
  { hour: "21:00", p50: 24, p99: 52 }
];

export function App() {
  // 1. Live streaming signal
  const streamData = signal(generateStreamWindow());
  const isStreaming = signal(true);

  // Interval for streaming updates
  let timer: any = null;
  const startStream = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (!isStreaming()) return;
      const t = new Date();
      const timeStr = `${t.getMinutes().toString().padStart(2, "0")}:${t.getSeconds().toString().padStart(2, "0")}`;
      streamData.update((prev) => {
        const next = [
          ...prev.slice(1),
          {
            time: timeStr,
            throughput: Math.floor(340 + Math.random() * 220),
            memory: Math.floor(220 + Math.random() * 75)
          }
        ];
        return next;
      });
    }, 1000);
  };

  startStream();
  onCleanup(() => {
    if (timer) clearInterval(timer);
  });

  const toggleStream = () => {
    isStreaming.update((v) => !v);
  };

  const injectSpike = () => {
    streamData.update((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const last = copy[copy.length - 1]!;
      copy[copy.length - 1] = {
        ...last,
        throughput: 880,
        memory: 395
      };
      return copy;
    });
  };

  // 2. Bar chart signals
  const financialData = signal(INITIAL_FINANCIALS);
  const randomizeFinancials = () => {
    financialData.set([
      {
        quarter: "Q1 '25",
        revenue: Math.floor(70 + Math.random() * 40),
        expenses: Math.floor(45 + Math.random() * 25)
      },
      {
        quarter: "Q2 '25",
        revenue: Math.floor(95 + Math.random() * 50),
        expenses: Math.floor(60 + Math.random() * 25)
      },
      {
        quarter: "Q3 '25",
        revenue: Math.floor(85 + Math.random() * 45),
        expenses: Math.floor(55 + Math.random() * 25)
      },
      {
        quarter: "Q4 '25",
        revenue: Math.floor(130 + Math.random() * 60),
        expenses: Math.floor(75 + Math.random() * 30)
      },
      {
        quarter: "Q1 '26",
        revenue: Math.floor(150 + Math.random() * 70),
        expenses: Math.floor(85 + Math.random() * 35)
      }
    ]);
  };

  // 3. Traffic Donut signal
  const trafficData = signal(INITIAL_TRAFFIC);
  const randomizeTraffic = () => {
    const r1 = Math.floor(25 + Math.random() * 30);
    const r2 = Math.floor(20 + Math.random() * 25);
    const r3 = Math.floor(10 + Math.random() * 20);
    const r4 = Math.max(5, 100 - (r1 + r2 + r3));
    trafficData.set([
      { source: "Direct", share: r1, color: "#8b5cf6" },
      { source: "Search", share: r2, color: "#3b82f6" },
      { source: "Social", share: r3, color: "#10b981" },
      { source: "Referral", share: r4, color: "#f59e0b" }
    ]);
  };

  return (
    <div class="dashboard">
      {/* Header */}
      <header class="dash-header">
        <div class="brand">
          <div class="brand-badge">Visage</div>
          <div>
            <h1>Charts Showcase</h1>
            <p>Zero-VDOM, fine-grained reactive SVG data visualizations</p>
          </div>
        </div>

        <div class="header-meta">
          <button
            type="button"
            class={() => `btn ${isStreaming() ? "active" : ""}`}
            onClick={toggleStream}
          >
            {() => (isStreaming() ? "Pause Feed" : "Resume Feed")}
          </button>
          <button type="button" class="btn" onClick={injectSpike}>
            Trigger Spike
          </button>
        </div>
      </header>

      {/* KPI Stats Strip */}
      <div class="stat-strip">
        <div class="stat-card">
          <div class="stat-label">Current Throughput</div>
          <div class="stat-val-group">
            <span class="stat-val">
              {() => {
                const list = streamData();
                const last = list[list.length - 1];
                return `${last ? last.throughput : 0} req/s`;
              }}
            </span>
            <span class="stat-delta">+14.2%</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Memory Footprint</div>
          <div class="stat-val-group">
            <span class="stat-val">
              {() => {
                const list = streamData();
                const last = list[list.length - 1];
                return `${last ? last.memory : 0} MB`;
              }}
            </span>
            <span class="stat-delta" style={{ color: "#38bdf8" }}>
              Normal
            </span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Median Latency (P50)</div>
          <div class="stat-val-group">
            <span class="stat-val">24.5 ms</span>
            <span class="stat-delta" style={{ color: "#10b981" }}>
              -3.1ms
            </span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">System Uptime</div>
          <div class="stat-val-group">
            <span class="stat-val">99.99%</span>
            <span class="stat-delta">Healthy</span>
          </div>
        </div>
      </div>

      {/* Grid of Charts */}
      <div class="charts-grid">
        {/* 1. Live Streaming Area & Line Chart */}
        <section class="chart-card full-width">
          <div class="card-top">
            <div>
              <h2 class="card-title">Real-Time Engine Throughput & Memory</h2>
              <p class="card-subtitle">
                Fine-grained streaming SVG updates at 1Hz with zero virtual DOM overhead
              </p>
            </div>
            <div class="card-actions">
              <span class={() => `pill-badge ${isStreaming() ? "live" : ""}`}>
                {() => (isStreaming() ? [<span class="pulse-dot" />, "LIVE 1s"] : "PAUSED")}
              </span>
            </div>
          </div>

          <div class="chart-wrapper">
            <Chart
              data={streamData}
              height={300}
              margin={{ top: 16, right: 24, bottom: 28, left: 44 }}
            >
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke="#71717a" />
              <YAxis stroke="#71717a" format={(val) => `${val}`} />
              <Area
                dataKey="throughput"
                name="Throughput (req/s)"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="rgba(139, 92, 246, 0.16)"
                curve="smooth"
              />
              <Line
                dataKey="memory"
                name="Memory (MB)"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 3, fill: "#09090b", stroke: "#38bdf8" }}
                curve="smooth"
              />
              <ChartCursor stroke="#52525b" strokeDasharray="4 4" />
              <ChartTooltip
                format={(val, name) => `${val} ${name.includes("Memory") ? "MB" : "req/s"}`}
              />
              <ChartLegend align="right" />
            </Chart>
          </div>
        </section>

        {/* 2. Grouped Bar Chart */}
        <section class="chart-card">
          <div class="card-top">
            <div>
              <h2 class="card-title">Quarterly Financial Performance</h2>
              <p class="card-subtitle">Grouped band scale bars with custom radius & labels</p>
            </div>
            <div class="card-actions">
              <button type="button" class="btn" onClick={randomizeFinancials}>
                Randomize
              </button>
            </div>
          </div>

          <div class="chart-wrapper">
            <Chart
              data={financialData}
              height={290}
              margin={{ top: 16, right: 16, bottom: 28, left: 40 }}
            >
              <CartesianGrid vertical={false} stroke="#27272a" />
              <XAxis dataKey="quarter" stroke="#71717a" />
              <YAxis stroke="#71717a" format={(val) => `$${val}k`} />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={5} maxWidth={28} />
              <Bar dataKey="expenses" name="Expenses" fill="#6366f1" radius={5} maxWidth={28} />
              <ChartCursor stroke="#52525b" />
              <ChartTooltip format={(val) => `$${val},000`} />
              <ChartLegend align="center" />
            </Chart>
          </div>
        </section>

        {/* 3. Donut / Pie Chart */}
        <section class="chart-card">
          <div class="card-top">
            <div>
              <h2 class="card-title">Traffic Acquisition Share</h2>
              <p class="card-subtitle">Smooth arc generation with inner and outer radii</p>
            </div>
            <div class="card-actions">
              <button type="button" class="btn" onClick={randomizeTraffic}>
                Shuffle
              </button>
            </div>
          </div>

          <div
            class="chart-wrapper"
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div style={{ position: "relative", width: "240px", height: "240px" }}>
              <Chart
                data={trafficData}
                width={240}
                height={240}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <Pie
                  dataKey="share"
                  innerRadius={58}
                  outerRadius={92}
                  colors={["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"]}
                  padAngle={0.03}
                />
              </Chart>
              <div class="donut-center-stat">
                <div class="donut-center-val">100%</div>
                <div class="donut-center-lbl">Share</div>
              </div>
            </div>

            {/* Side breakdown list */}
            <div
              style={{ marginLeft: "28px", display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {() =>
                trafficData().map((item) => (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "24px",
                      fontSize: "13px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "3px",
                          background: item.color
                        }}
                      />
                      <span style={{ color: "var(--fg-muted)" }}>{item.source}</span>
                    </div>
                    <span style={{ fontWeight: "600", color: "#fafafa" }}>{item.share}%</span>
                  </div>
                ))
              }
            </div>
          </div>
        </section>

        {/* 4. Multi-Line SLA Percentiles Chart */}
        <section class="chart-card full-width">
          <div class="card-top">
            <div>
              <h2 class="card-title">API Response Latency Percentiles (P50 vs. P99)</h2>
              <p class="card-subtitle">
                Monotonic smooth spline interpolation with interactive cursor inspection
              </p>
            </div>
            <div class="card-actions">
              <span class="pill-badge">24h History</span>
            </div>
          </div>

          <div class="chart-wrapper">
            <Chart
              data={LATENCY_SERIES}
              height={280}
              margin={{ top: 16, right: 24, bottom: 28, left: 44 }}
            >
              <CartesianGrid stroke="#27272a" strokeDasharray="2 2" />
              <XAxis dataKey="hour" stroke="#71717a" />
              <YAxis stroke="#71717a" format={(val) => `${val}ms`} />
              <Line
                dataKey="p50"
                name="P50 Median"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#09090b", stroke: "#38bdf8" }}
                curve="smooth"
              />
              <Line
                dataKey="p99"
                name="P99 Critical"
                stroke="#f43f5e"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#09090b", stroke: "#f43f5e" }}
                curve="smooth"
              />
              <ChartCursor stroke="#71717a" strokeDasharray="3 3" />
              <ChartTooltip format={(val) => `${val} ms`} />
              <ChartLegend align="right" />
            </Chart>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer class="dash-footer">
        <div>Visage Charts &bull; Zero external D3/Chart.js runtime dependencies</div>
        <div>Built for speed and precision</div>
      </footer>
    </div>
  );
}
