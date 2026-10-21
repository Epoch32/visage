import { computed, createSignal, For, render, Show } from "@epoch32/visage";
import { explainForConsumer } from "./decoder";

const CONSUMER_EXAMPLES = [
  {
    label: "Payment didn't go through",
    data: {
      type: "https://api.example.com/errors/billing/insufficient-funds#add-payment-method",
      title: "Insufficient Funds",
      status: 402,
      detail: "Your account balance is too low for this purchase.",
      instance: "checkout/order_84920",
      balance: 14.2,
      required: 50.0
    }
  },
  {
    label: "Mistakes on a form",
    data: {
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: "A couple of fields need your attention before you can sign up.",
      instance: "accounts/register",
      invalidParams: [
        {
          name: "email",
          reason: "Please enter a valid email address (example: name@domain.com)"
        },
        {
          name: "age",
          reason: "You must be at least 18 years old to create an account"
        }
      ]
    }
  },
  {
    label: "Too many attempts (please wait)",
    data: {
      type: "https://api.example.com/problems/rate-limit-exceeded",
      title: "Too Many Requests",
      status: 429,
      detail: "You've tried this action several times in a row.",
      retryAfter: 30,
      instance: "login/verify-code"
    }
  },
  {
    label: "Need to sign in / no access",
    data: {
      type: "https://api.example.com/errors/security/insufficient-scope",
      title: "Forbidden",
      status: 403,
      detail: "This area is restricted to team administrators.",
      instance: "workspace/billing-settings"
    }
  },
  {
    label: "Temporary service outage",
    data: {
      type: "urn:ietf:rfc:9110#section-15.6.4",
      title: "Service Unavailable",
      status: 503,
      detail: "Our servers are currently undergoing brief routine maintenance.",
      traceId: "SRV-MAINT-9182"
    }
  }
];

function getInitialState(): { initialInput: string; initialIndex: number | null } {
  if (typeof window !== "undefined" && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get("url") || params.get("type");
    const jsonParam = params.get("json") || params.get("data");
    const statusParam = params.get("status");
    const detailParam = params.get("detail");

    if (jsonParam) {
      return { initialInput: jsonParam, initialIndex: null };
    }

    if (urlParam) {
      const data: Record<string, any> = { type: urlParam };
      if (statusParam) data.status = Number(statusParam) || 400;
      if (detailParam) data.detail = detailParam;
      return { initialInput: JSON.stringify(data, null, 2), initialIndex: null };
    }

    if (detailParam || statusParam) {
      const data: Record<string, any> = {};
      if (statusParam) data.status = Number(statusParam) || 500;
      if (detailParam) data.detail = detailParam;
      return { initialInput: JSON.stringify(data, null, 2), initialIndex: null };
    }
  }
  return { initialInput: "", initialIndex: 0 };
}

export function App() {
  const init = getInitialState();
  const [activeExampleIndex, setActiveExampleIndex] = createSignal<number | null>(init.initialIndex);
  const [customInput, setCustomInput] = createSignal(init.initialInput);
  const [isTechnicalOpen, setIsTechnicalOpen] = createSignal(Boolean(init.initialInput));
  const [copied, setCopied] = createSignal(false);

  const activeProblemData = computed(() => {
    const raw = customInput().trim();
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return {
          title: "Unrecognized Error Message",
          detail: raw,
          status: 400
        };
      }
    }
    const idx = activeExampleIndex();
    if (idx !== null && CONSUMER_EXAMPLES[idx]) {
      return CONSUMER_EXAMPLES[idx]!.data;
    }
    return CONSUMER_EXAMPLES[0]!.data;
  });

  const explanation = computed(() => {
    return explainForConsumer(activeProblemData());
  });

  const onSelectExample = (idx: number) => {
    setCustomInput("");
    setActiveExampleIndex(idx);
  };

  const onCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="container">
      <header>
        <h1>What Went Wrong?</h1>
        <p>Simple, clear explanations of everyday website and app errors - and how to fix them.</p>
      </header>

      <div class="selector-label">Common Situations</div>
      <div class="example-buttons">
        {CONSUMER_EXAMPLES.map((item, idx) => (
          <button
            class={() =>
              activeExampleIndex() === idx && !customInput()
                ? "example-btn active"
                : "example-btn"
            }
            onClick={() => onSelectExample(idx)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* The Plain-Language Result Card */}
      <div class="result-card">
        <div class="card-top">
          <span
            class={() =>
              explanation().severity === "system-issue"
                ? "badge badge-system-issue"
                : explanation().severity === "info"
                  ? "badge badge-info"
                  : "badge badge-user-action"
            }
          >
            {explanation().severityLabel}
          </span>
          <span class="category-text">{explanation().category}</span>
        </div>

        <div class="headline">{explanation().headline}</div>

        <div class="explanation-text">{explanation().explanation}</div>

        <Show when={() => explanation().helpfulContext}>
          {(ctx) => <div class="context-box">{ctx()}</div>}
        </Show>

        {/* If there are specific form fields to fix */}
        <Show when={() => explanation().itemsToFix.length > 0}>
          <div>
            <div class="action-title">Things to double-check:</div>
            <div class="fix-list">
              <For each={() => explanation().itemsToFix}>
                {(item) => (
                  <div class="fix-item">
                    <div class="fix-field">{item.field}</div>
                    <div class="fix-issue">{item.issue}</div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* What to do next */}
        <div class="action-block">
          <div class="action-title">What you should do:</div>
          <ol class="action-list">
            <For each={() => explanation().actionSteps}>
              {(step) => <li>{step}</li>}
            </For>
          </ol>
        </div>

        {/* Support Code for Customer Service */}
        <Show when={() => explanation().supportReference}>
          {(ref) => (
            <div class="support-footer">
              <span>
                Support reference code: <span class="support-ref">{ref()}</span>
              </span>
              <button
                class="copy-btn"
                onClick={() => onCopyCode(ref())}
              >
                {copied() ? "Copied!" : "Copy Code"}
              </button>
            </div>
          )}
        </Show>
      </div>

      {/* Advanced Drawer for pasting raw text / JSON */}
      <div class="toggle-technical">
        <button
          class="toggle-btn"
          onClick={() => setIsTechnicalOpen(!isTechnicalOpen())}
        >
          {isTechnicalOpen()
            ? "Hide text input"
            : "Have a specific error message? Paste it here"}
        </button>

        <Show when={isTechnicalOpen}>
          <div class="technical-box">
            <textarea
              class="technical-textarea"
              placeholder="Paste raw error message or details here..."
              value={customInput}
              onInput={(e: any) => {
                setActiveExampleIndex(null);
                setCustomInput(e.target.value);
              }}
            />
          </div>
        </Show>
      </div>
    </div>
  );
}

const root = document.getElementById("app");
if (root) {
  render(() => <App />, root);
}
