import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  HelpCircle,
  Lock,
  Mail,
  ShieldAlert
} from "lucide-react";
import { createSignal } from "visage";
import { createForm, v } from "visage/form";
import { Switch, Tooltip, toast } from "visage/ui";
import { evaluatePassword } from "./types";

interface LoginFormProps {
  onRequireMfa: (email: string) => void;
  onForgotPassword: () => void;
}

export function LoginForm(props: LoginFormProps) {
  const [showPassword, setShowPassword] = createSignal(false);
  const [rememberDevice, setRememberDevice] = createSignal(true);
  const [passwordStats, setPasswordStats] = createSignal(evaluatePassword(""));

  const form = createForm({
    initialValues: {
      email: "",
      password: ""
    },
    schema: v.object({
      email: v
        .string()
        .email("Please provide a valid corporate email (e.g., alex@enterprise.com)")
        .min(5, "Email is required"),
      password: v.string().min(8, "Enterprise password policy requires at least 8 characters")
    }),
    validateOn: "change",
    onSubmit: async (values) => {
      // Simulate enterprise gateway handshake
      await new Promise((r) => setTimeout(r, 650));

      if (values.email.endsWith("@disallowed.com")) {
        form.setFieldError("email", "Domain disallowed by organization security policy");
        toast({
          title: "Access Restricted",
          description: "Domain disallowed by organization security policy.",
          variant: "error"
        });
        return;
      }

      toast({
        title: "Primary Credentials Verified",
        description: "Requesting Step-Up MFA authentication token...",
        variant: "info"
      });

      props.onRequireMfa(values.email);
    }
  });

  const handlePasswordInput = (e: any) => {
    const val = e.target.value;
    form.fields.password.value.set(val);
    form.fields.password.touched.set(true);
    setPasswordStats(evaluatePassword(val));
  };

  const handlePasskeyAuth = async () => {
    toast({
      title: "WebAuthn Handshake",
      description: "Interacting with hardware security key / TouchID...",
      variant: "info"
    });
    await new Promise((r) => setTimeout(r, 800));
    toast({
      title: "Biometric Verified",
      description: "Hardware credential approved by FIPS 140-3 enclave.",
      variant: "success"
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      {/* Corporate Email */}
      <div class="form-group">
        <label class="form-label" htmlFor="login-email">
          <span>Corporate Work Email</span>
        </label>
        <div class="input-wrapper">
          <span class="input-icon">
            <Mail size={16} />
          </span>
          <input
            id="login-email"
            type="email"
            class={() =>
              `form-input ${form.fields.email.error() && form.fields.email.touched() ? "has-error" : ""}`
            }
            placeholder="name@company.com"
            value={() => form.fields.email.value()}
            onInput={(e: any) => {
              form.fields.email.value.set(e.target.value);
              form.fields.email.touched.set(true);
            }}
          />
        </div>
        {() =>
          form.fields.email.error() && form.fields.email.touched() ? (
            <div class="field-error">
              <ShieldAlert size={13} />
              <span>{form.fields.email.error()}</span>
            </div>
          ) : null
        }
      </div>

      {/* Master Password */}
      <div class="form-group">
        <div class="label-row">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label class="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>
              Master Password
            </label>
            <Tooltip
              content="Requires 8+ characters, uppercase, lowercase, and special characters."
              contentClass="auth-tooltip-box"
            >
              <HelpCircle
                size={14}
                color="#94a3b8"
                style={{ cursor: "help", display: "inline-block" }}
              />
            </Tooltip>
          </div>
          <button type="button" class="link-btn" onClick={props.onForgotPassword}>
            Forgot password?
          </button>
        </div>

        <div class="input-wrapper">
          <span class="input-icon">
            <Lock size={16} />
          </span>
          <input
            id="login-password"
            type={() => (showPassword() ? "text" : "password")}
            class={() =>
              `form-input ${form.fields.password.error() && form.fields.password.touched() ? "has-error" : ""}`
            }
            placeholder="••••••••••••"
            value={() => form.fields.password.value()}
            onInput={handlePasswordInput}
          />
          <button
            type="button"
            class="input-action-btn"
            onClick={() => setShowPassword(!showPassword())}
            aria-label="Toggle password visibility"
          >
            {() => (showPassword() ? <EyeOff size={16} /> : <Eye size={16} />)}
          </button>
        </div>

        {/* Dynamic Entropy Meter */}
        {() => {
          const stats = passwordStats();
          const pwd = form.fields.password.value();
          if (!pwd) return null;

          return (
            <div class="password-meter">
              <div class="meter-tracks">
                <div class={`meter-track ${stats.score >= 1 ? `active-${stats.label}` : ""}`} />
                <div class={`meter-track ${stats.score >= 2 ? `active-${stats.label}` : ""}`} />
                <div class={`meter-track ${stats.score >= 3 ? `active-${stats.label}` : ""}`} />
                <div class={`meter-track ${stats.score >= 4 ? `active-${stats.label}` : ""}`} />
              </div>
              <div class="meter-labels">
                <span class={`meter-text ${stats.label}`}>Entropy: {stats.label}</span>
                <span class="meter-hint">
                  {stats.score < 3
                    ? "Add symbols & mixed case"
                    : "Meets enterprise security threshold"}
                </span>
              </div>
            </div>
          );
        }}

        {() =>
          form.fields.password.error() && form.fields.password.touched() ? (
            <div class="field-error">
              <ShieldAlert size={13} />
              <span>{form.fields.password.error()}</span>
            </div>
          ) : null
        }
      </div>

      {/* Workstation Trust Switch */}
      <div class="options-row">
        <div class="switch-label-group">
          <Switch
            id="trust-device"
            class="switch-root"
            thumbClass="switch-thumb-el"
            checked={rememberDevice}
            onCheckedChange={(val: boolean) => setRememberDevice(val)}
          />
          <label htmlFor="trust-device" class="switch-text">
            Remember device for 30 days
          </label>
        </div>
      </div>

      {/* Primary Submit Button */}
      <button type="submit" class="btn-primary" disabled={() => form.isSubmitting()}>
        {() =>
          form.isSubmitting() ? (
            <>
              <span class="spinner" />
              <span>Authenticating Gateway...</span>
            </>
          ) : (
            <>
              <span>Sign In with Aegis ID</span>
              <ArrowRight size={16} />
            </>
          )
        }
      </button>

      <div class="divider">
        <span>or passwordless</span>
      </div>

      {/* WebAuthn / Passkey Button */}
      <button type="button" class="btn-secondary-full" onClick={handlePasskeyAuth}>
        <Fingerprint size={16} color="#60a5fa" />
        <span>Use FIDO2 / Passkey Hardware</span>
      </button>
    </form>
  );
}
