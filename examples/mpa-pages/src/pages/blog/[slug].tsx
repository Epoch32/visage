import { createSignal, Link } from "@epoch32/visage";

interface BlogPostProps {
  params: {
    slug: string;
  };
}

export default function BlogPostPage(props: BlogPostProps) {
  const [likes, setLikes] = createSignal(12);
  const slug = props.params?.slug || "unknown";

  return (
    <article style={{ maxWidth: "720px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/blog"
          prefetch="hover"
          style={{
            fontSize: "13px",
            color: "#58a6ff",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: "16px"
          }}
        >
          &larr; Back to Blog
        </Link>
        <div style={{ fontSize: "12px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Dynamic Route: /blog/[slug].tsx
        </div>
        <h1 style={{ fontSize: "36px", fontWeight: 800, color: "#f0f6fc", margin: "12px 0" }}>
          Post: {slug}
        </h1>
      </div>

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
          Extracted Route Parameter:
        </div>
        <code style={{ fontSize: "15px", color: "#7ee787", backgroundColor: "#0d1117", padding: "4px 8px", borderRadius: "4px" }}>
          props.params.slug = "{slug}"
        </code>
      </div>

      <div style={{ fontSize: "16px", lineHeight: "1.7", color: "#c9d1d9" }}>
        <p>
          This page component was matched dynamically by the Visage MPA router using the regex
          pattern for <code>/blog/:slug</code>.
        </p>
        <p>
          Notice how the URL parameter is passed cleanly into the component props, while the
          page still executes client-side fine-grained signals:
        </p>
      </div>

      {/* Interactive signal inside dynamic page */}
      <div
        style={{
          marginTop: "32px",
          paddingTop: "24px",
          borderTop: "1px solid #30363d",
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}
      >
        <button
          type="button"
          onClick={() => setLikes((l) => l + 1)}
          style={{
            backgroundColor: "#21262d",
            color: "#f0f6fc",
            border: "1px solid #30363d",
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>❤️ Like this post</span>
          <span
            style={{
              backgroundColor: "#30363d",
              padding: "2px 8px",
              borderRadius: "10px",
              fontSize: "12px"
            }}
          >
            {likes}
          </span>
        </button>
      </div>
    </article>
  );
}
