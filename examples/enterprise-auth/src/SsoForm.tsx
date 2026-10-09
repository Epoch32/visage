/** @jsxImportSource visage */
import { ArrowRight, Building2, ExternalLink, KeyRound, ShieldAlert } from "lucide-react";
import { createForm, v } from "visage/form";
import { toast } from "visage/ui";

interface SsoFormProps {
  onSsoRedirect: (org: string) => void;
}

export function SsoForm(props: SsoFormProps) {
  const form = createForm({
    initialValues: {
      orgSlug: ""
    },
    schema: v.object({
      orgSlug: v
        .string()
        .min(2, "Organization domain is required")
        .regex(/^[a-z0-9-]+$/i, "Only alphanumeric characters and hyphens allowed")
    }),
    validateOn: "change",
    onSubmit: async (values) => {
      await new Promise((r) => setTimeout(r, 600));

      toast({
        title: "SAML 2.0 Handshake",
        description: `Redirecting to identity provider for ${values.orgSlug}.aegis.cloud...`,
        variant: "info"
      });

      props.onSsoRedirect(values.orgSlug);
    }
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <div class="form-group">
        <label class="form-label" htmlFor="sso-domain">
          <span>Enterprise Organization Domain</span>
        </label>
        <div class="input-wrapper">
          <span class="input-icon">
            <Building2 size={16} />
          </span>
          <input
            id="sso-domain"
            type="text"
            class={() =>
              `form-input ${form.fields.orgSlug.error() && form.fields.orgSlug.touched() ? "has-error" : ""}`
            }
            placeholder="acme-corp"
            value={() => form.fields.orgSlug.value()}
            onInput={(e: any) => {
              form.fields.orgSlug.value.set(e.target.value);
              form.fields.orgSlug.touched.set(true);
            }}
          />
        </div>
        {() =>
          form.fields.orgSlug.error() && form.fields.orgSlug.touched() ? (
            <div class="field-error">
              <ShieldAlert size={13} />
              <span>{form.fields.orgSlug.error()}</span>
            </div>
          ) : null
        }
      </div>

      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "12px", color: "var(--fg-muted)", lineHeight: 1.5 }}>
          Your enterprise administrator has configured SAML 2.0 Single Sign-On. You will be
          redirected to your company's Identity Provider (Okta, Azure AD, Ping, Google).
        </p>
      </div>

      <button type="submit" class="btn-primary" disabled={() => form.isSubmitting()}>
        {() =>
          form.isSubmitting() ? (
            <>
              <span class="spinner" />
              <span>Routing SAML Endpoint...</span>
            </>
          ) : (
            <>
              <span>Continue with SAML SSO</span>
              <ArrowRight size={16} />
            </>
          )
        }
      </button>

      <div class="divider">
        <span>supported IdP partners</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <button
          type="button"
          class="btn-secondary-full"
          style={{ fontSize: "12px", padding: "10px" }}
          onClick={() =>
            toast({
              title: "Okta Federation",
              description: "Direct SAML federation initiated for Okta Universal Directory."
            })
          }
        >
          <KeyRound size={14} color="#60a5fa" />
          <span>Okta SSO</span>
        </button>
        <button
          type="button"
          class="btn-secondary-full"
          style={{ fontSize: "12px", padding: "10px" }}
          onClick={() =>
            toast({
              title: "Microsoft Entra ID",
              description: "Direct OIDC federation initiated for Azure AD tenant."
            })
          }
        >
          <ExternalLink size={14} color="#a78bfa" />
          <span>Microsoft Entra</span>
        </button>
      </div>
    </form>
  );
}
