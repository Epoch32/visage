import { render, signal } from "visage";
import { isNativeApp, native } from "visage/native";

function App() {
  const isDesktop = signal(isNativeApp());
  const hostInfo = signal<any>({ os: "detecting...", arch: "" });
  const selectedTopic = signal("nature");

  // Dialog & Notification state signals
  const selectedPath = signal("");
  const savedPath = signal("");
  const dialogResult = signal("");
  const notificationStatus = signal("");
  const notificationSupported = signal<boolean | null>(null);

  // Runs on construct/mount
  native.invoke("getSystemInfo").then((info) => {
    hostInfo.set(info);
  });

  native.notification.isSupported().then((supported) => {
    notificationSupported.set(supported);
  });

  const handleOpenFile = async () => {
    try {
      const res = await native.dialog.open({
        title: "Select a File to Inspect",
        multiple: false
      });
      selectedPath.set(res ? String(res) : "(Cancelled)");
    } catch (err: any) {
      selectedPath.set(`Error: ${err.message}`);
    }
  };

  const handleOpenFolder = async () => {
    try {
      const res = await native.dialog.open({
        title: "Select a Directory",
        directory: true
      });
      selectedPath.set(res ? `Folder: ${res}` : "(Cancelled)");
    } catch (err: any) {
      selectedPath.set(`Error: ${err.message}`);
    }
  };

  const handleSaveFile = async () => {
    try {
      const res = await native.dialog.save({
        title: "Save Project Snapshot",
        defaultName: "visage-export.json"
      });
      savedPath.set(res ? String(res) : "(Cancelled)");
    } catch (err: any) {
      savedPath.set(`Error: ${err.message}`);
    }
  };

  const handleMessageDialog = async (level: "info" | "question" | "warning" | "error") => {
    try {
      const confirmed = await native.dialog.message({
        title: `Visage ${level.toUpperCase()}`,
        message: `Native <b>${level}</b> dialog test.\nDo you accept this action?`,
        level,
        buttons: level === "question" ? "yesNo" : "okCancel"
      });
      dialogResult.set(`Level: ${level} -> User responded: ${confirmed ? "Yes / OK" : "No / Cancel"}`);
    } catch (err: any) {
      dialogResult.set(`Error: ${err.message}`);
    }
  };

  const handleSendNotification = async () => {
    try {
      await native.notification.send({
        title: "Visage Native Host",
        body: `Desktop notification emitted at ${new Date().toLocaleTimeString()}!\nZero-VDOM reactivity on native desktop.`,
        urgency: "normal",
        icon: "dialog-information"
      });
      notificationStatus.set(`Delivered at ${new Date().toLocaleTimeString()}`);
    } catch (err: any) {
      notificationStatus.set(`Error: ${err.message}`);
    }
  };

  const btnStyle = {
    color: "#f8fafc",
    background: "#334155",
    border: "1px solid #475569",
    borderRadius: "6px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background 0.15s ease"
  };

  return (
    <div style={{ padding: "32px", maxWidth: "680px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "6px", color: "#f8fafc" }}>
        Visage Native Demo
      </h1>
      <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "0", marginBottom: "20px" }}>
        Native OS desktop host running with active security transforms, OS dialogs, and notifications.
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

      {/* Native Dialogs Card */}
      <div
        style={{
          background: "#1e293b",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #334155",
          marginBottom: "16px"
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#e2e8f0" }}>
          Native System Dialogs (GTK / OS Native)
        </h3>
        <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "0", marginBottom: "12px" }}>
          Modal file choosers and message dialogs invoked via typed asynchronous IPC bridge.
        </p>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          <button style={btnStyle} onClick={handleOpenFile}>
            Open File...
          </button>
          <button style={btnStyle} onClick={handleOpenFolder}>
            Open Folder...
          </button>
          <button style={btnStyle} onClick={handleSaveFile}>
            Save File As...
          </button>
          <button style={btnStyle} onClick={() => handleMessageDialog("question")}>
            Confirm (Yes/No)
          </button>
          <button style={btnStyle} onClick={() => handleMessageDialog("warning")}>
            Warning Alert
          </button>
        </div>

        <div
          style={{
            background: "#0f172a",
            padding: "10px 12px",
            borderRadius: "6px",
            border: "1px solid #334155",
            fontSize: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }}
        >
          <div>
            <span style={{ color: "#94a3b8" }}>Selected Path: </span>
            <code style={{ color: "#38bdf8" }}>{() => selectedPath() || "None"}</code>
          </div>
          <div>
            <span style={{ color: "#94a3b8" }}>Saved Path: </span>
            <code style={{ color: "#38bdf8" }}>{() => savedPath() || "None"}</code>
          </div>
          <div>
            <span style={{ color: "#94a3b8" }}>Dialog Result: </span>
            <code style={{ color: "#4ade80" }}>{() => dialogResult() || "None"}</code>
          </div>
        </div>
      </div>

      {/* Desktop Notifications Card */}
      <div
        style={{
          background: "#1e293b",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #334155",
          marginBottom: "16px"
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#e2e8f0" }}>
          Desktop Notifications
        </h3>
        <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "0", marginBottom: "12px" }}>
          System notification server integration with title, body, and urgency.
        </p>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
          <button
            style={{ ...btnStyle, background: "#2563eb", borderColor: "#3b82f6" }}
            onClick={handleSendNotification}
          >
            Send Notification
          </button>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Supported:{" "}
            <strong style={{ color: "#f8fafc" }}>
              {() => (notificationSupported() === null ? "checking..." : notificationSupported() ? "Yes" : "No")}
            </strong>
          </span>
        </div>

        <div
          style={{
            background: "#0f172a",
            padding: "10px 12px",
            borderRadius: "6px",
            border: "1px solid #334155",
            fontSize: "12px"
          }}
        >
          <span style={{ color: "#94a3b8" }}>Notification Status: </span>
          <code style={{ color: "#38bdf8" }}>{() => notificationStatus() || "Idle"}</code>
        </div>
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
            height: "180px",
            objectFit: "cover",
            borderRadius: "6px",
            display: "block"
          }}
        />
        <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px", marginBottom: "0" }}>
          Source: <code>https://images.unsplash.com</code> (Auto-whitelisted via CSP scanner)
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
