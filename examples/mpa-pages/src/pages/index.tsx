import { createSignal } from "@epoch32/visage";

export default function HomePage() {
  const [count, setCount] = createSignal(0);

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <h1
          style={{
            fontSize: "42px",
            fontWeight: 800,
            letterSpacing: "-1px",
            color: "#f0f6fc",
            marginBottom: "16px"
          }}
        >
          Opinionated Multi-Page Apps
        </h1>
        <p style={{ fontSize: "18px", color: "#8b949e", maxWidth: "640px", margin: "0 auto" }}>
          Zero-configuration file-system routing, isolated per-page bundles, and automatic build-time
          Static Site Generation (SSG).
        </p>
      </div>

      {/* Interactive Reactive Island */}
      <div
        style={{
          backgroundColor: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "40px",
          textAlign: "center"
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", color: "#58a6ff", fontSize: "16px" }}>
          ⚡ Fine-Grained Reactive Island
        </h3>
        <p style={{ margin: "0 0 16px 0", color: "#8b949e", fontSize: "14px" }}>
          Even in an MPA, each page has full access to Visage signals with zero Virtual DOM overhead:
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
          <button
            type="button"
            onClick={() => setCount((c) => c - 1)}
            style={{
              backgroundColor: "#21262d",
              color: "#c9d1d9",
              border: "1px solid #30363d",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "16px",
              cursor: "pointer"
            }}
          >
            -
          </button>
          <span style={{ fontSize: "24px", fontWeight: 700, minWidth: "48px", color: "#58a6ff" }}>
            {count}
          </span>
          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
            style={{
              backgroundColor: "#238636",
              color: "#ffffff",
              border: "1px solid #2ea043",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "16px",
              cursor: "pointer"
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Feature Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
        <div
          style={{
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "10px",
            padding: "20px"
          }}
        >
          <h3 style={{ margin: "0 0 8px 0", color: "#f0f6fc", fontSize: "16px" }}>📁 File-System Driven</h3>
          <p style={{ margin: 0, color: "#8b949e", fontSize: "14px", lineHeight: "1.5" }}>
            Drop files in <code>src/pages/</code>. Routes, dynamic segments (<code>[slug].tsx</code>), and catch-alls (<code>[...all].tsx</code>) resolve automatically.
          </p>
        </div>

        <div
          style={{
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "10px",
            padding: "20px"
          }}
        >
          <h3 style={{ margin: "0 0 8px 0", color: "#f0f6fc", fontSize: "16px" }}>🚀 Build-Time SSG</h3>
          <p style={{ margin: 0, color: "#8b949e", fontSize: "14px", lineHeight: "1.5" }}>
            <code>vite build</code> outputs static <code>.html</code> files into <code>dist/</code> ready for Cloudflare Pages, Vercel, or Netlify.
          </p>
        </div>

        <div
          style={{
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "10px",
            padding: "20px"
          }}
        >
          <h3 style={{ margin: "0 0 8px 0", color: "#f0f6fc", fontSize: "16px" }}>🛡️ Isolated Bundles</h3>
          <p style={{ margin: 0, color: "#8b949e", fontSize: "14px", lineHeight: "1.5" }}>
            Each page only loads its own scripts, keeping initial page load sizes tiny and SEO indexability at 100%.
          </p>
        </div>
      </div>
    </div>
  );
}
