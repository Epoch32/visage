import { Activity, CheckCircle2, Cpu, Globe2, ShieldCheck } from "lucide-react";

export function BrandPanel() {
  return (
    <aside class="brand-panel">
      <div class="brand-header">
        <div class="brand-logo">
          <div class="brand-icon-box">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div class="brand-name">AEGIS CLOUD</div>
          </div>
        </div>
        <div class="brand-badge">Enterprise v4.2</div>
      </div>

      <div class="brand-content">
        <h1 class="brand-headline">
          Zero-Trust Access for <span class="brand-headline-gradient">Global Workforces</span>
        </h1>
        <p class="brand-description">
          Hardware-backed cryptography, instant SCIM synchronization, and continuous device posture
          evaluation.
        </p>

        {/* Live Security Monitor Widget */}
        <div class="security-monitor-card">
          <div class="monitor-header">
            <div class="monitor-title">
              <Activity size={14} color="#3b82f6" />
              <span>Real-Time Telemetry</span>
            </div>
            <div class="status-indicator">
              <span class="ping-dot" />
              <span>100% Operational</span>
            </div>
          </div>

          <div class="monitor-grid">
            <div class="metric-box">
              <div class="metric-label">Uptime SLA</div>
              <div class="metric-val" style={{ color: "#10b981" }}>
                99.995%
              </div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Auth Latency</div>
              <div class="metric-val">18ms</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Active Nodes</div>
              <div class="metric-val">48 Global</div>
            </div>
          </div>
        </div>

        {/* Compliance Certification Badges */}
        <div class="compliance-row">
          <div class="compliance-badge">
            <CheckCircle2 size={13} color="#10b981" />
            <span>SOC 2 Type II Certified</span>
          </div>
          <div class="compliance-badge">
            <CheckCircle2 size={13} color="#10b981" />
            <span>ISO 27001 / 27701</span>
          </div>
          <div class="compliance-badge">
            <CheckCircle2 size={13} color="#10b981" />
            <span>FIPS 140-3 Hardware Key</span>
          </div>
        </div>
      </div>

      <div class="brand-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Globe2 size={14} />
          <span>Encrypted Gateway via WireGuard / TLS 1.3</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Cpu size={14} />
          <span>Visage Reactive Core</span>
        </div>
      </div>
    </aside>
  );
}
