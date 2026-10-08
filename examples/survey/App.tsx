import { VisageDevTools } from "visage/devtools";
import { QueryClient, QueryClientProvider } from "visage/query";
import { Link, Route, Router, Routes } from "visage/router";
import { Style } from "visage/style";
import { LiveDashboard } from "./LiveDashboard";
import { SurveyWizard } from "./SurveyWizard";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {() => (
        <Router>
          {() => (
            <div class="app-layout">
              <header class="app-navbar">
                <div class="brand">
                  <div class="brand-icon">
                    <svg
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <title>Visage Logo</title>
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <span class="brand-text">Visage Insights</span>
                  <span class="brand-tag">Enterprise</span>
                </div>
                <nav class="nav-links">
                  <Link href="/">Survey Form</Link>
                  <Link href="/analytics">Live Analytics</Link>
                </nav>
              </header>

              <main class="app-main">
                <Routes>
                  <Route path="/" component={() => <SurveyWizard surveyId="survey_dx_2026" />} />
                  <Route path="/analytics" component={() => <LiveDashboard />} />
                </Routes>
              </main>

              {/* In-Browser Reactive DevTools Inspector */}
              <VisageDevTools />

              <Style
                classes={{
                  "app-layout": {
                    maxWidth: "860px",
                    margin: "0 auto",
                    padding: "36px 20px 60px"
                  },
                  "app-navbar": {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 20px",
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: "12px",
                    marginBottom: "28px"
                  },
                  brand: {
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontWeight: 600,
                    fontSize: "1.05rem",
                    letterSpacing: "-0.01em"
                  },
                  "brand-icon": {
                    width: "24px",
                    height: "24px",
                    color: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  },
                  "brand-text": {
                    color: "var(--text)",
                    fontWeight: 600
                  },
                  "brand-tag": {
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    background: "var(--card-subtle)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: "1px solid var(--card-border)",
                    marginLeft: "4px"
                  },
                  "nav-links": {
                    display: "flex",
                    gap: "6px",
                    background: "var(--card-subtle)",
                    padding: "4px",
                    borderRadius: "8px",
                    border: "1px solid var(--card-border)",
                    "& a": {
                      color: "var(--text-secondary)",
                      textDecoration: "none",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      padding: "6px 14px",
                      borderRadius: "6px",
                      transition: "all 0.15s ease"
                    },
                    "& a:hover": {
                      color: "var(--text)"
                    },
                    "& a.active": {
                      background: "var(--card-bg)",
                      color: "var(--text)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      border: "1px solid var(--card-border)"
                    }
                  },
                  "app-main": {
                    width: "100%"
                  }
                }}
              />
            </div>
          )}
        </Router>
      )}
    </QueryClientProvider>
  );
}
