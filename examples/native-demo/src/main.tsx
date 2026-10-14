import { render, signal } from "visage";
import { native, isNativeApp } from "visage/native";

function App() {
  const isDesktop = signal(isNativeApp());
  const hostInfo = signal<any>({ os: "detecting...", arch: "" });

  // Runs on construct/mount
  native.invoke("getSystemInfo").then((info) => {
    hostInfo.set(info);
  });

  return (
    <div style={{ padding: "32px", maxWidth: "600px", margin: "0 auto" }}>

      <div
        style={{
          background: "#1e293b",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #334155",
          fontSize: "13px"
        }}
      >
        <p><strong>Host Environment:</strong> {() => (isDesktop() ? "Native Window" : "Web Preview")}</p>
        <p><strong>OS Target:</strong> {() => hostInfo().os}</p>
        <p><strong>CPU Arch:</strong> {() => hostInfo().arch}</p>
      </div>
    </div>
  );
}

render(() => <App />, document.getElementById("app")!);
