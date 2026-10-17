import { type Child, Link } from "@epoch32/visage";

interface LayoutProps {
  children: Child;
  params: Record<string, string>;
}

export default function RootLayout(props: LayoutProps) {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const getLinkStyle = (href: string) => {
    const active = currentPath === href || (href !== "/" && currentPath.startsWith(href));
    return {
      color: active ? "#58a6ff" : "#c9d1d9",
      textDecoration: "none",
      borderBottom: active ? "2px solid #58a6ff" : "2px solid transparent",
      paddingBottom: "4px",
      transition: "color 0.2s, border-color 0.2s"
    };
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0d1117",
        color: "#c9d1d9",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          background-color: #0d1117;
        }
      `}</style>
      <header
        style={{
          borderBottom: "1px solid #30363d",
          backgroundColor: "#161b22",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/"
            prefetch="hover"
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#58a6ff",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span style={{ fontSize: "22px" }}>⚡</span> Visage MPA
          </Link>
          <span
            style={{
              fontSize: "11px",
              backgroundColor: "#21262d",
              color: "#8b949e",
              padding: "2px 8px",
              borderRadius: "12px",
              border: "1px solid #30363d"
            }}
          >
            Multi-Page App
          </span>
        </div>

        <nav style={{ display: "flex", gap: "18px", fontSize: "14px", fontWeight: 500 }}>
          <Link href="/" prefetch="hover" style={getLinkStyle("/")}>
            Home
          </Link>
          <Link href="/about" prefetch="hover" style={getLinkStyle("/about")}>
            About
          </Link>
          <Link href="/blog" prefetch="hover" style={getLinkStyle("/blog")}>
            Blog
          </Link>
          <Link href="/contact" prefetch="hover" style={getLinkStyle("/contact")}>
            Contact
          </Link>
          <Link href="/docs/guide/overview" prefetch="hover" style={getLinkStyle("/docs/guide/overview")}>
            Docs
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1, maxWidth: "960px", width: "100%", margin: "0 auto", padding: "40px 24px" }}>
        {props.children}
      </main>

      <footer
        style={{
          borderTop: "1px solid #30363d",
          backgroundColor: "#161b22",
          padding: "24px",
          textAlign: "center",
          fontSize: "13px",
          color: "#8b949e"
        }}
      >
        <p style={{ margin: 0 }}>
          Built with <strong>Visage File-System MPA Pages Router</strong> • Fine-grained reactivity with zero VDOM
        </p>
      </footer>
    </div>
  );
}
