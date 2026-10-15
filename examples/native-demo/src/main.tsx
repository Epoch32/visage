import { render, signal } from "visage";
import { isNativeApp, native } from "visage/native";

function App() {
  const isDesktop = signal(isNativeApp());
  const hostInfo = signal<any>({ os: "detecting...", arch: "" });
  const selectedTopic = signal("nature");

  // Runs on construct/mount
  native.invoke("getSystemInfo").then((info) => {
    hostInfo.set(info);
  });

  return (
    <div style={{ padding: "32px", maxWidth: "600px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "6px" }}>Visage Native Demo</h1>
      <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "0", marginBottom: "20px" }}>
        Native OS desktop host running with active security transforms.
      </p>

      {/* Host Environment Info Card */}
      <div
        style={{
          background: "#1e293b",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #334155",
          fontSize: "13px",
          marginBottom: "16px"
        }}
      >
        <p style={{ margin: "4px 0" }}>
          <strong>Host Environment:</strong> {() => (isDesktop() ? "Native Window" : "Web Preview")}
        </p>
        <p style={{ margin: "4px 0" }}>
          <strong>OS Target:</strong> {() => hostInfo().os}
        </p>
        <p style={{ margin: "4px 0" }}>
          <strong>CPU Arch:</strong> {() => hostInfo().arch}
        </p>
      </div>

      {/* External Image Card */}
      <div
        style={{
          background: "#1e293b",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #334155",
          marginBottom: "16px"
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#e2e8f0" }}>External Media</h3>
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80"
          alt="Coastal Landscape"
          style={{
            width: "100%",
            height: "200px",
            objectFit: "cover",
            borderRadius: "6px",
            display: "block"
          }}
        />
        <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px", marginBottom: "0" }}>
          Source: <code>https://images.unsplash.com</code>
        </p>
      </div>

      {/* External Links Card (Rel Shield & URL Shield) */}
      <div
        style={{
          background: "#1e293b",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #334155"
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#e2e8f0" }}>External Links</h3>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
          <a
            href="https://github.com/epoch32/visage"
            target="_blank"
            style={{
              color: "#38bdf8",
              textDecoration: "none",
              fontSize: "13px",
              padding: "6px 12px",
              background: "#0f172a",
              borderRadius: "6px",
              border: "1px solid #334155"
            }}
          >
            Visage GitHub
          </a>
          <a
            href="https://ziglang.org"
            target="_blank"
            style={{
              color: "#38bdf8",
              textDecoration: "none",
              fontSize: "13px",
              padding: "6px 12px",
              background: "#0f172a",
              borderRadius: "6px",
              border: "1px solid #334155"
            }}
          >
            Zig Language
          </a>
          <a
            href={() => `https://unsplash.com/s/photos/${selectedTopic()}`}
            target="_blank"
            style={{
              color: "#38bdf8",
              textDecoration: "none",
              fontSize: "13px",
              padding: "6px 12px",
              background: "#0f172a",
              borderRadius: "6px",
              border: "1px solid #334155"
            }}
          >
            Dynamic Unsplash Search
          </a>
        </div>
        <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0" }}>
          Target blank links automatically enforce <code>rel="noopener noreferrer"</code> via Rel Shield.
        </p>
      </div>
    </div>
  );
}

render(() => <App />, document.getElementById("app")!);
