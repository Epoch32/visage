/** @jsxImportSource visage */
import { Building2, ChevronDown, Globe2, Lock, ShieldCheck } from "lucide-react";
import { createSignal } from "visage";
import { DropdownMenu, Tabs, Toast, toast } from "visage/ui";
import { BrandPanel } from "./BrandPanel";
import { LoginForm } from "./LoginForm";
import { SecurityModals } from "./SecurityModals";
import { SsoForm } from "./SsoForm";
import { REGIONS, type RegionOption } from "./types";

export function App() {
  const [selectedRegion, setSelectedRegion] = createSignal<RegionOption>(REGIONS[0]!);
  const [mfaOpen, setMfaOpen] = createSignal(false);
  const [mfaEmail, setMfaEmail] = createSignal("");
  const [forgotOpen, setForgotOpen] = createSignal(false);
  const [complianceOpen, setComplianceOpen] = createSignal(false);

  const handleRequireMfa = (email: string) => {
    setMfaEmail(email);
    setMfaOpen(true);
  };

  const handleSsoRedirect = (_org: string) => {
    // Handled in SsoForm
  };

  return (
    <Toast.Provider>
      {() => (
        <div class="auth-wrapper">
          {/* Left Enterprise Branding & Telemetry Panel */}
          <BrandPanel />

          {/* Right Authentication Panel */}
          <main class="auth-panel">
            <div class="auth-card">
              {/* Region / Realm Selector */}
              <div class="region-bar">
                <div class="region-label">
                  <Globe2 size={14} />
                  <span>Gateway Region:</span>
                </div>

                <DropdownMenu
                  trigger={
                    <button type="button" class="region-btn">
                      <span>{() => `${selectedRegion().flag} · ${selectedRegion().name}`}</span>
                      <ChevronDown size={13} />
                    </button>
                  }
                  contentClass="region-menu-card"
                  items={REGIONS.map((r) => ({
                    label: `${r.flag}  ${r.name} (${r.compliance})`,
                    class: "region-menu-item",
                    onSelect: () => {
                      setSelectedRegion(r);
                      toast({
                        title: "Gateway Switched",
                        description: `Traffic routed to ${r.name} (${r.location}).`,
                        variant: "info"
                      });
                    }
                  }))}
                />
              </div>

              {/* Header */}
              <div class="auth-header">
                <h2 class="auth-title">Enterprise Sign In</h2>
                <p class="auth-subtitle">
                  Authenticate using your corporate credentials or enterprise identity federation.
                </p>
              </div>

              {/* Dual Mode Tabs (Credentials vs SAML SSO) */}
              <Tabs
                defaultValue="credentials"
                listClass="auth-tabs-list"
                triggerClass="auth-tab-trigger"
                items={[
                  {
                    value: "credentials",
                    label: "Aegis ID",
                    icon: <Lock size={14} />,
                    content: () => (
                      <LoginForm
                        onRequireMfa={handleRequireMfa}
                        onForgotPassword={() => setForgotOpen(true)}
                      />
                    )
                  },
                  {
                    value: "sso",
                    label: "SAML / SSO",
                    icon: <Building2 size={14} />,
                    content: () => <SsoForm onSsoRedirect={handleSsoRedirect} />
                  }
                ]}
              />

              {/* Bottom Security Policy Link */}
              <div style={{ marginTop: "28px", textAlign: "center" }}>
                <button
                  type="button"
                  class="link-btn"
                  style={{ fontSize: "12px", color: "var(--fg-muted)" }}
                  onClick={() => setComplianceOpen(true)}
                >
                  <ShieldCheck
                    size={12}
                    style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }}
                  />
                  Zero-Trust Compliance & Endpoint Security Policy
                </button>
              </div>
            </div>
          </main>

          {/* Interactive Modals */}
          <SecurityModals
            mfaOpen={mfaOpen}
            onMfaOpenChange={setMfaOpen}
            mfaEmail={mfaEmail}
            forgotOpen={forgotOpen}
            onForgotOpenChange={setForgotOpen}
            complianceOpen={complianceOpen}
            onComplianceOpenChange={setComplianceOpen}
          />

          <Toast.Viewport class="toast-viewport" />
        </div>
      )}
    </Toast.Provider>
  );
}
