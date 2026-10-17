import { Link } from "@epoch32/visage";

export default function CustomNotFoundPage() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div
        style={{
          fontSize: "72px",
          fontWeight: 900,
          background: "linear-gradient(135deg, #58a6ff 0%, #bc8cff 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: 0,
          lineHeight: 1
        }}
      >
        404
      </div>
      <h2 style={{ fontSize: "24px", color: "#f0f6fc", margin: "16px 0 8px 0" }}>
        Page Not Found
      </h2>
      <p style={{ color: "#8b949e", fontSize: "16px", maxWidth: "420px", margin: "0 auto 24px auto" }}>
        Custom 404 component at <code>src/pages/404.tsx</code>. In production builds, Visage outputs this as <code>dist/404.html</code>.
      </p>
      <Link
        href="/"
        prefetch="hover"
        style={{
          display: "inline-block",
          backgroundColor: "#21262d",
          color: "#58a6ff",
          border: "1px solid #30363d",
          padding: "10px 20px",
          borderRadius: "6px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "14px"
        }}
      >
        Return to Homepage
      </Link>
    </div>
  );
}
