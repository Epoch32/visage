const prefetchedUrls = new Set<string>();

/**
 * Clear the internal prefetch URL cache (primarily for testing)
 */
export function clearPrefetchCache(): void {
  prefetchedUrls.clear();
}

/**
 * Speculatively prefetch a URL using the Speculation Rules API when supported,
 * falling back to <link rel="prefetch">.
 */
export function prefetch(url: string): void {
  if (typeof document === "undefined" || !url || prefetchedUrls.has(url)) return;
  if (
    url.startsWith("#") ||
    url.startsWith("javascript:") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:")
  ) {
    return;
  }
  prefetchedUrls.add(url);

  if (
    typeof HTMLScriptElement !== "undefined" &&
    typeof (HTMLScriptElement as any).supports === "function" &&
    (HTMLScriptElement as any).supports("speculationrules")
  ) {
    const script = document.createElement("script");
    script.type = "speculationrules";
    script.textContent = JSON.stringify({
      prefetch: [
        {
          source: "list",
          urls: [url]
        }
      ]
    });
    document.head.appendChild(script);
  } else if (typeof document.createElement === "function") {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    document.head.appendChild(link);
  }
}
