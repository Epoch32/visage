interface DocsCatchAllProps {
  params: {
    all: string;
  };
}

export default function DocsCatchAllPage(props: DocsCatchAllProps) {
  const path = props.params?.all || "getting-started";
  const segments = path.split("/").filter(Boolean);

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      <div style={{ fontSize: "12px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
        Catch-All Route: /docs/[...all].tsx
      </div>

      <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#f0f6fc", margin: "0 0 16px 0" }}>
        Documentation Catch-All
      </h1>

      <div
        style={{
          backgroundColor: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "28px"
        }}
      >
        <div style={{ fontSize: "13px", color: "#8b949e", marginBottom: "8px" }}>
          Captured Path Parameter (props.params.all):
        </div>
        <code style={{ fontSize: "15px", color: "#58a6ff", backgroundColor: "#0d1117", padding: "4px 8px", borderRadius: "4px" }}>
          "{path}"
        </code>

        <div style={{ marginTop: "14px", fontSize: "13px", color: "#8b949e" }}>
          Path Segments:
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
          {segments.map((seg, idx) => (
            <span
              style={{
                backgroundColor: "#21262d",
                border: "1px solid #30363d",
                color: "#c9d1d9",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "12px"
              }}
            >
              [{idx}] {seg}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <a
          href="/docs/guide/overview"
          style={{
            backgroundColor: "#21262d",
            color: "#58a6ff",
            border: "1px solid #30363d",
            padding: "8px 14px",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "13px"
          }}
        >
          Try /docs/guide/overview
        </a>
        <a
          href="/docs/api/signals/computed"
          style={{
            backgroundColor: "#21262d",
            color: "#58a6ff",
            border: "1px solid #30363d",
            padding: "8px 14px",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "13px"
          }}
        >
          Try /docs/api/signals/computed
        </a>
      </div>
    </div>
  );
}
