export interface ConsumerExplanation {
  // Friendly heading for the user
  headline: string;
  // Subtitle / category in plain words (e.g. "Account & Billing", "Sign In Problem", "System Maintenance")
  category: string;
  // What happened in clear everyday language
  explanation: string;
  // Clear, numbered or bulleted steps the user can take right now
  actionSteps: string[];
  // If user entered wrong info into a form, friendly list of what to fix
  itemsToFix: Array<{
    field: string;
    issue: string;
  }>;
  // Friendly status type for badge: "warning" (they can fix it) | "info" | "error" (server problem)
  severity: "user-action" | "system-issue" | "info";
  severityLabel: string;
  // Simple code they can give to customer support if they need help
  supportReference?: string;
  // Extra non-technical notes (e.g. countdown seconds, amount needed)
  helpfulContext?: string;
}

function cleanFieldName(raw: string): string {
  // Convert "user.address.postalCode" or "postal_code" -> "Postal Code"
  const lastPart = raw.split(".").pop() || raw;
  return lastPart
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function cleanIssueMessage(msg: string): string {
  const trimmed = msg.trim();
  if (!trimmed) return "Please review this information.";
  // Capitalize first letter and ensure ending punctuation
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return capitalized.endsWith(".") ? capitalized : `${capitalized}.`;
}

export function explainForConsumer(rawInput: unknown): ConsumerExplanation {
  let data: Record<string, any> = {};
  if (typeof rawInput === "string") {
    const trimmed = rawInput.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("urn:")) {
      data = { type: trimmed };
    } else {
      try {
        data = JSON.parse(trimmed);
      } catch {
        data = { detail: trimmed, title: "Custom Message" };
      }
    }
  } else if (typeof rawInput === "object" && rawInput !== null) {
    data = rawInput as Record<string, any>;
  }

  const status = typeof data.status === "number" ? data.status : (data.type ? 400 : 500);
  const rawType = typeof data.type === "string" ? data.type : "";
  const detail = typeof data.detail === "string" ? data.detail.trim() : "";
  const title = typeof data.title === "string" ? data.title.trim() : "";

  let fragmentAction: string | undefined;
  let urlSlugTitle: string | undefined;
  let urlDomainCategory: string | undefined;

  if (rawType.startsWith("http://") || rawType.startsWith("https://")) {
    try {
      const u = new URL(rawType);
      if (u.hash) {
        fragmentAction = cleanFieldName(u.hash.replace(/^#/, ""));
      }
      const segments = u.pathname.split("/").filter((s) => s && !["api", "errors", "problems", "v1", "v2"].includes(s.toLowerCase()));
      if (segments.length > 0) {
        urlSlugTitle = cleanFieldName(segments[segments.length - 1]!);
        if (segments.length > 1) {
          urlDomainCategory = cleanFieldName(segments[segments.length - 2]!);
        }
      }
    } catch {
      // ignore
    }
  }

  // Support reference (order of preference: traceId -> requestId -> instance -> error code)
  const supportReference =
    data.traceId ||
    data.requestId ||
    data.correlationId ||
    data.id ||
    (typeof data.instance === "string" ? data.instance.replace(/^\/+/, "") : undefined) ||
    (status ? `ERR-${status}` : undefined);

  // Field fixes
  const itemsToFix: ConsumerExplanation["itemsToFix"] = [];
  if (Array.isArray(data.invalidParams)) {
    for (const item of data.invalidParams) {
      if (typeof item === "object" && item !== null) {
        const rawName = item.name || (Array.isArray(item.path) ? item.path.join(".") : item.path) || "Field";
        const rawReason = item.reason || item.message || "Please check this value.";
        itemsToFix.push({
          field: cleanFieldName(String(rawName)),
          issue: cleanIssueMessage(String(rawReason))
        });
      }
    }
  }

  // Deduce topic / category from type URL if available (e.g. /billing/ -> "Billing & Payments")
  let category = urlDomainCategory || "General";
  const typeLower = rawType.toLowerCase();

  if (typeLower.includes("billing") || typeLower.includes("payment") || typeLower.includes("funds") || status === 402) {
    category = "Billing & Payments";
  } else if (typeLower.includes("shipping") || typeLower.includes("delivery") || typeLower.includes("carrier")) {
    category = "Shipping & Delivery";
  } else if (typeLower.includes("auth") || typeLower.includes("login") || typeLower.includes("token") || typeLower.includes("scope") || status === 401 || status === 403) {
    category = "Sign In & Permissions";
  } else if (typeLower.includes("rate") || typeLower.includes("limit") || typeLower.includes("quota") || status === 429) {
    category = "Too Many Attempts";
  } else if (status === 404 || typeLower.includes("not-found")) {
    category = "Page or Item Not Found";
  } else if (status >= 500) {
    category = "Service Outage";
  } else if (itemsToFix.length > 0 || status === 400 || status === 422) {
    category = "Form & Details";
  }

  // Default explanations
  let headline = urlSlugTitle || title || "Something Needs Your Attention";
  let explanation = detail || (urlSlugTitle ? `The service reported an issue with: ${urlSlugTitle}.` : "We ran into an issue while processing your request.");
  let severity: ConsumerExplanation["severity"] = "user-action";
  let severityLabel = "Action Needed";
  const actionSteps: string[] = [];
  let helpfulContext: string | undefined;

  if (fragmentAction) {
    actionSteps.push(`Recommended action: ${fragmentAction}.`);
  }

  // 1. Validation / Form issues with specific fields
  if (itemsToFix.length > 0) {
    severity = "user-action";
    severityLabel = "Please Review";
    headline = urlSlugTitle || "Please check the information you entered";
    explanation = detail || "Some details you provided are missing or need to be corrected before we can continue.";
    actionSteps.push("Review the highlighted fields below.");
    actionSteps.push("Update the details and try submitting again.");
  }

  // 2. Billing / Payment issue (402 or billing type)
  else if (status === 402 || typeLower.includes("billing") || typeLower.includes("funds")) {
    severity = "user-action";
    severityLabel = "Payment Needed";
    headline = "Your payment couldn't be completed";
    explanation = detail || "Your account balance isn't high enough or the payment method couldn't be charged.";

    if (typeof data.balance === "number" && typeof data.required === "number") {
      helpfulContext = `Current balance: $${data.balance.toFixed(2)} - Total needed: $${data.required.toFixed(2)}`;
    }

    actionSteps.push("Add funds to your account balance or select a different card.");
    actionSteps.push("Try completing your purchase again.");
  }

  // 3. Rate limiting / Too many attempts (429)
  else if (status === 429 || typeLower.includes("rate-limit") || typeLower.includes("too-many")) {
    severity = "user-action";
    severityLabel = "Please Wait";
    headline = "You're trying a bit too fast";
    const retrySec = Number(data.retryAfter) || 30;
    explanation = detail || `To keep things secure and fair for everyone, we pause requests when there are too many attempts.`;
    helpfulContext = `Please wait about ${retrySec} seconds before clicking again.`;
    actionSteps.push(`Wait about ${retrySec} seconds.`);
    actionSteps.push("Refresh the page or try your action once more.");
  }

  // 4. Sign in / Permission (401 / 403)
  else if (status === 401 || status === 403 || typeLower.includes("unauthorized") || typeLower.includes("forbidden") || typeLower.includes("scope")) {
    severity = "user-action";
    severityLabel = "Access Restricted";
    headline = status === 401 ? "Please sign in to continue" : "You don't have access to this area";
    explanation = detail || (status === 401
      ? "Your session may have expired or you might need to log in first."
      : "Your account doesn't have permission to view or edit this content.");
    actionSteps.push(status === 401 ? "Log in with your username and password." : "Contact an administrator or account owner to request access.");
  }

  // 5. Not Found (404)
  else if (status === 404) {
    severity = "info";
    severityLabel = "Not Found";
    headline = "We couldn't find what you're looking for";
    explanation = detail || "The page, link, or item might have been moved, renamed, or deleted.";
    actionSteps.push("Check the link or address for any typos.");
    actionSteps.push("Go back to the previous page or visit the home screen.");
  }

  // 6. Conflict (409)
  else if (status === 409) {
    severity = "user-action";
    severityLabel = "Update Conflict";
    headline = "Someone else made a change first";
    explanation = detail || "The item you're editing was modified in another window or by another team member.";
    actionSteps.push("Refresh the page to see the latest version.");
    actionSteps.push("Re-apply your changes so nothing gets lost.");
  }

  // 7. Server / System problem (500, 502, 503, 504)
  else if (status >= 500) {
    severity = "system-issue";
    severityLabel = "Problem On Our End";
    headline = "Something went wrong on our end";
    explanation = detail || "Our system ran into an unexpected hiccup. This is not your fault.";
    actionSteps.push("Wait a minute and refresh the page.");
    actionSteps.push("If the problem continues, contact our support team and share the reference code below.");
  }

  // If no action steps were assigned, provide sensible general guidance
  if (actionSteps.length === 0) {
    actionSteps.push("Check your connection and try refreshing the page.");
    actionSteps.push("If you keep seeing this message, reach out to customer support.");
  }

  return {
    headline,
    category,
    explanation,
    actionSteps,
    itemsToFix,
    severity,
    severityLabel,
    supportReference,
    helpfulContext
  };
}
