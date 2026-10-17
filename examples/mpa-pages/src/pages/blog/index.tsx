import { Link } from "@epoch32/visage";

const posts = [
  {
    slug: "signals-zero-vdom",
    title: "Why Zero-VDOM Fine-Grained Reactivity Wins",
    date: "Oct 15, 2026",
    summary: "How point-to-point DOM updates outperform virtual DOM diffing in real-world benchmarks."
  },
  {
    slug: "opinionated-mpas",
    title: "Introducing Visage Opinionated MPAs",
    date: "Oct 17, 2026",
    summary: "File-system routing with static HTML pre-rendering built directly into Vite."
  },
  {
    slug: "tactile-glass-spatial",
    title: "4px Spatial Engine & Tactile Glass UI",
    date: "Oct 12, 2026",
    summary: "Building physically consistent design systems with depth, elevation, and spring physics."
  }
];

export default function BlogIndexPage() {
  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#f0f6fc", margin: "0 0 8px 0" }}>
          Visage Blog
        </h1>
        <p style={{ color: "#8b949e", margin: 0 }}>
          Articles and tutorials demonstrating Visage's reactive architecture.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {posts.map((post) => (
          <article
            style={{
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "8px",
              padding: "20px",
              transition: "border-color 0.2s ease"
            }}
          >
            <div style={{ fontSize: "12px", color: "#8b949e", marginBottom: "6px" }}>
              {post.date}
            </div>
            <h2 style={{ fontSize: "18px", margin: "0 0 8px 0" }}>
              <Link
                href={`/blog/${post.slug}`}
                prefetch="hover"
                style={{ color: "#58a6ff", textDecoration: "none", fontWeight: 600 }}
              >
                {post.title}
              </Link>
            </h2>
            <p style={{ color: "#8b949e", fontSize: "14px", margin: 0, lineHeight: "1.5" }}>
              {post.summary}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
