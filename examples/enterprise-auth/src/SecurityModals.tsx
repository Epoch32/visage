import { Check, KeyRound, Shield, X } from "lucide-react";
import { createSignal } from "visage";
import { Dialog, toast } from "visage/ui";

interface SecurityModalsProps {
  mfaOpen: () => boolean;
  onMfaOpenChange: (open: boolean) => void;
  mfaEmail: () => string;
  forgotOpen: () => boolean;
  onForgotOpenChange: (open: boolean) => void;
  complianceOpen: () => boolean;
  onComplianceOpenChange: (open: boolean) => void;
}

export function SecurityModals(props: SecurityModalsProps) {
  const [pinDigits, setPinDigits] = createSignal(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = createSignal(false);

  const handleVerifyMfa = async () => {
    setIsVerifying(true);
    await new Promise((r) => setTimeout(r, 700));
    setIsVerifying(false);
    props.onMfaOpenChange(false);
    toast({
      title: "Authentication Successful",
      description: "Zero-Trust session token issued. Redirecting to Aegis Console...",
      variant: "success"
    });
  };

  const handleDigitChange = (index: number, val: string) => {
    const current = [...pinDigits()];
    current[index] = val.slice(-1);
    setPinDigits(current);
  };

  return (
    <>
      {/* Step-Up MFA Dialog */}
      <Dialog open={props.mfaOpen} onOpenChange={props.onMfaOpenChange}>
        {() => (
          <>
            <Dialog.Overlay class="dialog-overlay-backdrop" />
            <Dialog.Content class="enterprise-modal-card">
              <div class="modal-header-row">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <KeyRound size={20} color="#3b82f6" />
                  <span class="modal-title-text">Step-Up MFA Verification</span>
                </div>
                <Dialog.Close class="link-btn" style={{ color: "var(--fg-muted)" }}>
                  <X size={18} />
                </Dialog.Close>
              </div>

              <p class="modal-desc-text">
                Enter the 6-digit temporary authenticator code (TOTP) from your mobile security app
                for <strong style={{ color: "var(--fg-primary)" }}>{props.mfaEmail}</strong>.
              </p>

              <div class="mfa-pin-grid">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    class="mfa-pin-input"
                    value={() => pinDigits()[idx] || ""}
                    onInput={(e: any) => handleDigitChange(idx, e.target.value)}
                  />
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <Dialog.Close
                  class="btn-secondary-full"
                  style={{ width: "auto", padding: "8px 16px" }}
                >
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  class="btn-primary"
                  style={{ width: "auto", padding: "8px 20px" }}
                  onClick={handleVerifyMfa}
                  disabled={() => isVerifying()}
                >
                  {() =>
                    isVerifying() ? (
                      <>
                        <span class="spinner" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Verify Token</span>
                      </>
                    )
                  }
                </button>
              </div>
            </Dialog.Content>
          </>
        )}
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog
        open={props.forgotOpen}
        onOpenChange={props.onForgotOpenChange}
        title="Enterprise Password Recovery"
        description="Self-service recovery will transmit a cryptographically signed magic link to your verified corporate address."
        contentClass="enterprise-modal-card"
        overlayClass="dialog-overlay-backdrop"
        footer={
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}
          >
            <Dialog.Close class="btn-secondary-full" style={{ width: "auto", padding: "8px 16px" }}>
              Cancel
            </Dialog.Close>
            <Dialog.Close
              class="btn-primary"
              style={{ width: "auto", padding: "8px 20px" }}
              onClick={() =>
                toast({
                  title: "Recovery Dispatched",
                  description: "Signed recovery instructions sent to registered recovery address.",
                  variant: "success"
                })
              }
            >
              Send Magic Link
            </Dialog.Close>
          </div>
        }
      >
        <div class="form-group">
          <label class="form-label" htmlFor="recovery-email">
            Corporate Email
          </label>
          <input
            id="recovery-email"
            type="email"
            class="form-input"
            placeholder="name@company.com"
          />
        </div>
      </Dialog>

      {/* Compliance / Security Policy Modal */}
      <Dialog
        open={props.complianceOpen}
        onOpenChange={props.onComplianceOpenChange}
        title="Zero-Trust Compliance & Device Policy"
        description="All authentication attempts are logged for SOC 2 Type II audit compliance."
        contentClass="enterprise-modal-card"
        overlayClass="dialog-overlay-backdrop"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
            <Dialog.Close class="btn-primary" style={{ width: "auto", padding: "8px 20px" }}>
              Acknowledge Policy
            </Dialog.Close>
          </div>
        }
      >
        <div style={{ fontSize: "13px", color: "var(--fg-secondary)", lineHeight: 1.6 }}>
          <p style={{ marginBottom: "12px" }}>
            By logging in, you confirm that this workstation complies with organizational endpoint
            protection requirements, including disk encryption, EDR telemetry, and secure enclave
            enrollment.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#60a5fa" }}>
            <Shield size={16} />
            <span>FIPS 140-3 Enclave Cryptography Enforced</span>
          </div>
        </div>
      </Dialog>
    </>
  );
}
