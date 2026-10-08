import { For } from "visage/dom";
import { createQuery } from "visage/query";
import { createClient } from "visage/rpc";
import { onCleanup, signal } from "visage/signals";
import { Style } from "visage/style";
import { Card } from "./components/ui";
import type { SurveyResponseRecord, SurveyRouter } from "./server";

export function LiveDashboard(props: { client?: ReturnType<typeof createClient<SurveyRouter>> }) {
  const rpc = props.client ?? createClient<SurveyRouter>({ baseUrl: "/api/rpc" });

  const liveFeed = signal<SurveyResponseRecord[]>([], { name: "dashboard.liveFeed" });

  // Fetch initial stats from server
  const stats = createQuery(rpc.getStats.queryOptions());

  // Connect to SSE real-time stream
  const sub = rpc.liveFeed.subscribe(undefined, {
    onData: (newResponse) => {
      liveFeed.update((prev) => [newResponse, ...prev]);
      stats.refetch();
    }
  });

  onCleanup(() => {
    sub.unsubscribe();
  });

  return (
    <Card>
      <div class="dashboard-header">
        <div>
          <h2>Real-Time Analytics & Response Stream</h2>
          <p class="subtitle">Live response feed synchronized via Server-Sent Events</p>
        </div>
        <div class="live-status-pill">
          <span class="radar-dot" /> LIVE STREAM ACTIVE
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-label">Total Submissions</span>
          <span class="metric-val">{() => stats.data()?.totalResponses ?? 0}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Mean Satisfaction</span>
          <span class="metric-val">
            {() => stats.data()?.averageSatisfaction ?? 0}
            <span class="metric-sub"> / 5.0</span>
          </span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Session Ingested</span>
          <span class="metric-val">{() => liveFeed().length}</span>
        </div>
      </div>

      {/* Real-time incoming response feed */}
      <div class="feed-section">
        <h3>Live Event Activity</h3>
        <div class="feed-list">
          <For
            each={liveFeed}
            fallback={
              <div class="empty-state">
                <p>Waiting for survey submissions...</p>
                <span class="hint">
                  Submit a response from the Survey Form tab to observe real-time ingestion.
                </span>
              </div>
            }
          >
            {(item) => {
              const emailPrefix = (item.respondentEmail || "U").split("@")[0] ?? "U";
              const initials = emailPrefix.slice(0, 2).toUpperCase();

              return (
                <div class="feed-card">
                  <div class="feed-card-header">
                    <div class="user-info">
                      <div class="user-avatar">{initials}</div>
                      <span class="user-email">{item.respondentEmail}</span>
                      <span class="role-badge">{item.primaryRole}</span>
                    </div>
                    <div class="score-badges">
                      <span class="score-badge">
                        Satisfaction: <span>{item.satisfactionScore}/5</span>
                      </span>
                      <span class="nps-badge">
                        NPS: <span>{item.recommendLikelihood}/10</span>
                      </span>
                    </div>
                  </div>
                  <p class="feedback-text">"{item.featureFeedback}"</p>
                  <div class="feed-footer">
                    <span class="timestamp">
                      Logged at {new Date(item.submittedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      <Style
        classes={{
          "dashboard-header": {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "28px"
          },
          "dashboard-header h2": {
            fontSize: "1.4rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginBottom: "4px"
          },
          "live-status-pill": {
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.75rem",
            fontWeight: 600,
            fontFamily: "var(--mono)",
            background: "var(--success-soft)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            color: "var(--success)",
            padding: "5px 10px",
            borderRadius: "9999px",
            letterSpacing: "0.05em"
          },
          "radar-dot": {
            width: "7px",
            height: "7px",
            background: "var(--success)",
            borderRadius: "50%",
            boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.7)",
            animation: "radarPulse 2s infinite cubic-bezier(0.66, 0, 0, 1)"
          },
          "@keyframes radarPulse": {
            to: { boxShadow: "0 0 0 8px rgba(16, 185, 129, 0)" }
          },
          "metrics-grid": {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            marginBottom: "36px"
          },
          "metric-card": {
            background: "var(--card-subtle)",
            border: "1px solid var(--card-border)",
            padding: "18px 20px",
            borderRadius: "10px"
          },
          "metric-label": {
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "var(--text-muted)",
            display: "block",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.04em"
          },
          "metric-val": {
            fontSize: "1.6rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--text)",
            fontFamily: "var(--mono)"
          },
          "metric-sub": {
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginLeft: "2px"
          },
          "feed-section h3": {
            fontSize: "1rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "14px",
            letterSpacing: "-0.01em"
          },
          "feed-list": {
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          },
          "feed-card": {
            background: "var(--card-subtle)",
            border: "1px solid var(--card-border)",
            borderRadius: "10px",
            padding: "16px 18px",
            transition: "border-color 0.15s ease",
            "&:hover": { borderColor: "var(--card-border-hover)" }
          },
          "feed-card-header": {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px"
          },
          "user-info": {
            display: "flex",
            alignItems: "center",
            gap: "8px"
          },
          "user-avatar": {
            width: "26px",
            height: "26px",
            borderRadius: "6px",
            background: "#272f42",
            border: "1px solid var(--card-border)",
            color: "var(--text)",
            fontSize: "0.75rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--mono)"
          },
          "user-email": {
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--text)"
          },
          "role-badge": {
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            color: "var(--text-secondary)",
            padding: "2px 7px",
            borderRadius: "4px",
            fontSize: "0.75rem",
            fontWeight: 500
          },
          "score-badges": {
            display: "flex",
            gap: "8px",
            alignItems: "center"
          },
          "score-badge": {
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            color: "var(--text-secondary)",
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "0.75rem",
            fontFamily: "var(--mono)",
            fontWeight: 500,
            "& span": { color: "var(--primary)", fontWeight: 600 }
          },
          "nps-badge": {
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            color: "var(--text-secondary)",
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "0.75rem",
            fontFamily: "var(--mono)",
            fontWeight: 500,
            "& span": { color: "var(--success)", fontWeight: 600 }
          },
          "feedback-text": {
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            lineHeight: 1.5,
            marginBottom: "8px"
          },
          "feed-footer": {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          },
          timestamp: {
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            fontFamily: "var(--mono)"
          },
          "empty-state": {
            textAlign: "center",
            padding: "36px 20px",
            background: "var(--card-subtle)",
            border: "1px dashed var(--card-border)",
            borderRadius: "10px",
            "& p": {
              fontSize: "0.9rem",
              color: "var(--text-secondary)",
              marginBottom: "4px"
            },
            "& .hint": { fontSize: "0.8rem", color: "var(--text-muted)" }
          }
        }}
      />
    </Card>
  );
}
