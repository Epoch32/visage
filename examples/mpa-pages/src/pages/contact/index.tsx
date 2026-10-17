import { createSignal } from "@epoch32/visage";

export default function ContactPage() {
  const [name, setName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [submitted, setSubmitted] = createSignal(false);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (name() && email()) {
      setSubmitted(true);
    }
  };

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#f0f6fc", marginBottom: "8px" }}>
        Contact Us
      </h1>
      <p style={{ color: "#8b949e", marginBottom: "28px" }}>
        Nested index route at <code>src/pages/contact/index.tsx</code> mapping to <code>/contact</code>.
      </p>

      {() =>
        submitted() ? (
          <div
            style={{
              backgroundColor: "rgba(35, 134, 54, 0.15)",
              border: "1px solid #2ea043",
              borderRadius: "8px",
              padding: "24px",
              textAlign: "center"
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", color: "#3fb950" }}>Message Received!</h3>
            <p style={{ margin: 0, color: "#c9d1d9", fontSize: "14px" }}>
              Thank you, <strong>{name}</strong> ({email})! We will get back to you shortly.
            </p>
            <button
              type="button"
              onClick={() => {
                setName("");
                setEmail("");
                setSubmitted(false);
              }}
              style={{
                marginTop: "16px",
                backgroundColor: "#21262d",
                color: "#c9d1d9",
                border: "1px solid #30363d",
                padding: "6px 14px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px"
              }}
            >
              Send another message
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "8px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px"
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#c9d1d9",
                  marginBottom: "6px"
                }}
              >
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onInput={(e: any) => setName(e.target.value)}
                placeholder="Jane Developer"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: "#0d1117",
                  border: "1px solid #30363d",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  color: "#f0f6fc",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#c9d1d9",
                  marginBottom: "6px"
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onInput={(e: any) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: "#0d1117",
                  border: "1px solid #30363d",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  color: "#f0f6fc",
                  fontSize: "14px"
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: "#238636",
                color: "#ffffff",
                border: "1px solid #2ea043",
                padding: "10px 16px",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Submit Message
            </button>
          </form>
        )
      }
    </div>
  );
}
