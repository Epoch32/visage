import * as fs from "node:fs";
import * as path from "node:path";

export function handlePreviewRouting(
  req: any,
  res: any,
  next: any,
  outDir: string,
  basePrefix: string = "/"
) {
  if (!req.url || req.method !== "GET") return next();

  const [pathname, queryString] = req.url.split("?");
  const query = queryString ? `?${queryString}` : "";

  // Pass through Vite internals, node_modules, and files with static extensions
  if (
    pathname.startsWith("/@") ||
    pathname.startsWith("/node_modules") ||
    /\.[a-zA-Z0-9_-]+$/.test(pathname)
  ) {
    return next();
  }

  let cleanPath = pathname;
  if (basePrefix && basePrefix !== "/" && cleanPath.startsWith(basePrefix)) {
    cleanPath = cleanPath.slice(basePrefix.length - 1);
  }
  cleanPath = cleanPath.replace(/^\/+|\/+$/g, "");

  // Root path is handled by sirv (dist/index.html)
  if (!cleanPath) {
    return next();
  }

  // 1. Check directory index HTML: dist/about/index.html
  const dirIndexPath = path.join(outDir, cleanPath, "index.html");
  if (fs.existsSync(dirIndexPath)) {
    req.url = `/${cleanPath}/index.html${query}`;
    return next();
  }

  // 2. Check clean HTML file: dist/about.html
  const cleanHtmlPath = path.join(outDir, `${cleanPath}.html`);
  if (fs.existsSync(cleanHtmlPath)) {
    req.url = `/${cleanPath}.html${query}`;
    return next();
  }

  // 3. Fallback to 404.html if exists
  const notFoundPath = path.join(outDir, "404.html");
  if (fs.existsSync(notFoundPath)) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(fs.readFileSync(notFoundPath));
    return;
  }

  next();
}
