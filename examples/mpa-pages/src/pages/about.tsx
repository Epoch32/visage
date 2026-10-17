import { Link } from "@epoch32/visage";

export default function AboutPage() {
  return (
    <div style={{ maxWidth: "680px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#f0f6fc", marginBottom: "16px" }}>
        About Visage MPAs
      </h1>
      <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#8b949e", marginBottom: "20px" }}>
        Traditional Single-Page Applications (SPAs) bundle the entire site's JavaScript into a single
        payload. For content-focused sites, blogs, documentation, and e-commerce portals, Multi-Page
        Applications provide a dramatically better experience.
      </p>

      <div
        style={{
          borderLeft: "4px solid #58a6ff",
          backgroundColor: "#161b22",
          padding: "16px 20px",
          borderRadius: "0 8px 8px 0",
          marginBottom: "24px"
        }}
      >
        <p style={{ margin: 0, color: "#c9d1d9", fontSize: "14px" }}>
          <strong>No index.html boilerplate:</strong> Visage dynamically synthesizes the HTML shell in
          dev mode and statically pre-renders physical <code>index.html</code> files during production
          builds.
        </p>
      </div>

      <h2 style={{ fontSize: "20px", color: "#f0f6fc", marginTop: "32px", marginBottom: "12px" }}>
        How it Works Under the Hood
      </h2>
      <ul style={{ color: "#8b949e", lineHeight: "1.8", paddingLeft: "20px" }}>
        <li>Virtual entry generator connects each page file to Visage's fine-grained runtime.</li>
        <li>Shared <code>_layout.tsx</code> wraps all discovered pages with zero duplication.</li>
        <li>Automatic fallback to custom <code>404.tsx</code> or styled default error documents.</li>
      </ul>

      <p style={{ marginTop: "32px" }}>
        <Link href="/" prefetch="hover" style={{ color: "#58a6ff", textDecoration: "none", fontWeight: 600 }}>
          &larr; Return to Homepage
        </Link>
      </p>
    </div>
  );
}
