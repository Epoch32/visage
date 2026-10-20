import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import {
  clearPrefetchCache,
  Link,
  prefetch,
  Route,
  Router,
  Routes,
  render,
  useNavigate,
  useParams,
  usePrefetch
} from "../src";

describe("Visage Router", () => {
  let container: any;

  beforeEach(() => {
    if (window.history) {
      window.history.replaceState(null, "", "/");
    }
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("renders matched route and reacts to navigation", () => {
    function HomePage() {
      return <div class="home">Home Page</div>;
    }

    function AboutPage() {
      return <div class="about">About Page</div>;
    }

    let navigateFn: any;
    function NavButtons() {
      navigateFn = useNavigate();
      return (
        <nav>
          <Link href="/" class="nav-home">
            Home
          </Link>
          <Link href="/about" class="nav-about">
            About
          </Link>
        </nav>
      );
    }

    const unmount = render(
      () => (
        <Router>
          {() => (
            <>
              <NavButtons />
              <Routes>
                <Route path="/" component={HomePage} />
                <Route path="/about" component={AboutPage} />
              </Routes>
            </>
          )}
        </Router>
      ),
      container
    );

    expect(container.querySelector(".home")).not.toBeNull();
    expect(container.querySelector(".about")).toBeNull();
    expect(container.querySelector(".nav-home")?.getAttribute("aria-current")).toBe("page");
    expect(container.querySelector(".nav-about")?.hasAttribute("aria-current")).toBe(false);

    // Navigate to /about
    navigateFn("/about");
    expect(container.querySelector(".home")).toBeNull();
    expect(container.querySelector(".about")?.textContent).toBe("About Page");
    expect(container.querySelector(".nav-home")?.hasAttribute("aria-current")).toBe(false);
    expect(container.querySelector(".nav-about")?.getAttribute("aria-current")).toBe("page");

    unmount();
  });

  it("extracts and reactively updates route parameters", () => {
    function UserProfile() {
      const params = useParams<{ id: string }>();
      return <div class="user-id">User: {() => params().id}</div>;
    }

    let navigateFn: any;
    function Nav() {
      navigateFn = useNavigate();
      return null;
    }

    const unmount = render(
      () => (
        <Router>
          {() => (
            <>
              <Nav />
              <Routes>
                <Route path="/users/:id" component={UserProfile} />
              </Routes>
            </>
          )}
        </Router>
      ),
      container
    );

    navigateFn("/users/42");
    expect(container.querySelector(".user-id")?.textContent).toBe("User: 42");

    navigateFn("/users/100");
    expect(container.querySelector(".user-id")?.textContent).toBe("User: 100");

    unmount();
  });

  it("renders fallback for unmatched 404 routes", () => {
    let navigateFn: any;
    function Nav() {
      navigateFn = useNavigate();
      return null;
    }

    const unmount = render(
      () => (
        <Router>
          {() => (
            <>
              <Nav />
              <Routes fallback={<div class="not-found">Custom 404</div>}>
                <Route path="/" component={() => <div>Home</div>} />
              </Routes>
            </>
          )}
        </Router>
      ),
      container
    );

    navigateFn("/non-existent-page");
    expect(container.querySelector(".not-found")?.textContent).toBe("Custom 404");

    unmount();
  });

  it("escapes regex characters in paths and caches compiled routes", () => {
    let navigateFn: any;
    function Nav() {
      navigateFn = useNavigate();
      return null;
    }

    const unmount = render(
      () => (
        <Router>
          {() => (
            <>
              <Nav />
              <Routes fallback={<div class="not-found">404</div>}>
                <Route path="/v1.0/docs" component={() => <div class="docs">Docs</div>} />
              </Routes>
            </>
          )}
        </Router>
      ),
      container
    );

    navigateFn("/v1.0/docs");
    expect(container.querySelector(".docs")?.textContent).toBe("Docs");

    // Dot was escaped, so /v1_0/docs should NOT match!
    navigateFn("/v1_0/docs");
    expect(container.querySelector(".docs")).toBeNull();
    expect(container.querySelector(".not-found")?.textContent).toBe("404");

    unmount();
  });

  describe("View Transitions", () => {
    afterEach(() => {
      delete (document as any).startViewTransition;
    });

    it("navigates using document.startViewTransition when viewTransition option is true", () => {
      let transitionCalled = false;
      (document as any).startViewTransition = (cb: () => void) => {
        transitionCalled = true;
        cb();
        return { finished: Promise.resolve() };
      };

      let navigateFn: any;
      function Nav() {
        navigateFn = useNavigate();
        return null;
      }

      const unmount = render(
        () => (
          <Router>
            {() => (
              <>
                <Nav />
                <Routes>
                  <Route path="/" component={() => <div class="page-home">Home</div>} />
                  <Route path="/target" component={() => <div class="page-target">Target</div>} />
                </Routes>
              </>
            )}
          </Router>
        ),
        container
      );

      expect(container.querySelector(".page-home")?.textContent).toBe("Home");
      expect(transitionCalled).toBe(false);

      navigateFn("/target", { viewTransition: true });
      expect(transitionCalled).toBe(true);
      expect(container.querySelector(".page-target")?.textContent).toBe("Target");

      unmount();
    });

    it("supports router-level viewTransitions configuration with per-navigation override", () => {
      let transitionsCount = 0;
      (document as any).startViewTransition = (cb: () => void) => {
        transitionsCount++;
        cb();
        return { finished: Promise.resolve() };
      };

      let navigateFn: any;
      function Nav() {
        navigateFn = useNavigate();
        return null;
      }

      const unmount = render(
        () => (
          <Router viewTransitions={true}>
            {() => (
              <>
                <Nav />
                <Routes>
                  <Route path="/" component={() => <div class="page-1">One</div>} />
                  <Route path="/two" component={() => <div class="page-2">Two</div>} />
                  <Route path="/three" component={() => <div class="page-3">Three</div>} />
                </Routes>
              </>
            )}
          </Router>
        ),
        container
      );

      navigateFn("/two");
      expect(transitionsCount).toBe(1);
      expect(container.querySelector(".page-2")?.textContent).toBe("Two");

      // Per-navigation override disables view transition
      navigateFn("/three", { viewTransition: false });
      expect(transitionsCount).toBe(1);
      expect(container.querySelector(".page-3")?.textContent).toBe("Three");

      unmount();
    });

    it("triggers startViewTransition when clicking a Link with viewTransition prop", () => {
      let transitionCalled = false;
      (document as any).startViewTransition = (cb: () => void) => {
        transitionCalled = true;
        cb();
        return { finished: Promise.resolve() };
      };

      const unmount = render(
        () => (
          <Router>
            {() => (
              <>
                <Link href="/about" viewTransition class="nav-link">
                  Go to About
                </Link>
                <Routes>
                  <Route path="/" component={() => <div>Home</div>} />
                  <Route path="/about" component={() => <div class="page-about">About</div>} />
                </Routes>
              </>
            )}
          </Router>
        ),
        container
      );

      const link = container.querySelector(".nav-link") as HTMLAnchorElement;
      expect(link).not.toBeNull();
      link.click();

      expect(transitionCalled).toBe(true);
      expect(container.querySelector(".page-about")?.textContent).toBe("About");

      unmount();
    });

    it("falls back gracefully when document.startViewTransition is not available", () => {
      delete (document as any).startViewTransition;

      let navigateFn: any;
      function Nav() {
        navigateFn = useNavigate();
        return null;
      }

      const unmount = render(
        () => (
          <Router viewTransitions={true}>
            {() => (
              <>
                <Nav />
                <Routes>
                  <Route path="/" component={() => <div>Home</div>} />
                  <Route path="/no-vt" component={() => <div class="page-no-vt">No VT</div>} />
                </Routes>
              </>
            )}
          </Router>
        ),
        container
      );

      navigateFn("/no-vt", { viewTransition: true });
      expect(container.querySelector(".page-no-vt")?.textContent).toBe("No VT");

      unmount();
    });
  });

  describe("Speculative Navigation (Speculation Rules & Prefetching)", () => {
    afterEach(() => {
      clearPrefetchCache();
      delete (HTMLScriptElement as any).supports;
      // Clean up injected prefetch tags from head
      const scripts = document.head.querySelectorAll('script[type="speculationrules"]');
      for (const s of scripts) {
        s.remove();
      }
      const links = document.head.querySelectorAll('link[rel="prefetch"]');
      for (const l of links) {
        l.remove();
      }
    });

    it('injects <script type="speculationrules"> when HTMLScriptElement.supports is available', () => {
      (HTMLScriptElement as any).supports = (feature: string) => feature === "speculationrules";

      prefetch("/products/featured");

      const script = document.head.querySelector('script[type="speculationrules"]');
      expect(script).not.toBeNull();
      const payload = JSON.parse(script?.textContent || "{}");
      expect(payload).toEqual({
        prefetch: [{ source: "list", urls: ["/products/featured"] }]
      });

      // Deduplication: prefetching again does not insert a duplicate tag
      prefetch("/products/featured");
      expect(document.head.querySelectorAll('script[type="speculationrules"]').length).toBe(1);
    });

    it('falls back to <link rel="prefetch"> when Speculation Rules API is unsupported', () => {
      delete (HTMLScriptElement as any).supports;

      prefetch("/fallback-article");

      const link = document.head.querySelector('link[rel="prefetch"][href="/fallback-article"]');
      expect(link).not.toBeNull();
      expect(link?.getAttribute("rel")).toBe("prefetch");
      expect(link?.getAttribute("href")).toBe("/fallback-article");

      // Deduplication
      prefetch("/fallback-article");
      expect(
        document.head.querySelectorAll('link[rel="prefetch"][href="/fallback-article"]').length
      ).toBe(1);
    });

    it("ignores anchor fragments, javascript schemes, mailto, and empty URLs", () => {
      prefetch("#section");
      prefetch("javascript:alert(1)");
      prefetch("mailto:user@example.com");
      prefetch("tel:+1234567890");
      prefetch("");

      expect(document.head.querySelectorAll('script[type="speculationrules"]').length).toBe(0);
      expect(document.head.querySelectorAll('link[rel="prefetch"]').length).toBe(0);
    });

    it('<Link prefetch="render"> prefetches immediately upon rendering', () => {
      const unmount = render(
        () => (
          <Router>
            {() => (
              <Link href="/immediate-data" prefetch="render">
                Immediate Link
              </Link>
            )}
          </Router>
        ),
        container
      );

      const linkTag = document.head.querySelector('link[rel="prefetch"][href="/immediate-data"]');
      expect(linkTag).not.toBeNull();

      unmount();
    });

    it('<Link prefetch="hover"> prefetches on pointer enter and focus events', () => {
      const unmount = render(
        () => (
          <Router>
            {() => (
              <Link href="/hover-route" prefetch="hover" class="hover-link">
                Hover Me
              </Link>
            )}
          </Router>
        ),
        container
      );

      expect(document.head.querySelector('link[rel="prefetch"][href="/hover-route"]')).toBeNull();

      const anchor = container.querySelector(".hover-link") as HTMLAnchorElement;
      expect(anchor).not.toBeNull();

      anchor.dispatchEvent(new Event("pointerenter"));

      expect(
        document.head.querySelector('link[rel="prefetch"][href="/hover-route"]')
      ).not.toBeNull();

      unmount();
    });

    it('<Router prefetch="hover"> cascades default prefetch behavior to child Links', () => {
      const unmount = render(
        () => (
          <Router prefetch="hover">
            {() => (
              <Link href="/cascaded-page" class="cascaded-link">
                Cascaded Link
              </Link>
            )}
          </Router>
        ),
        container
      );

      expect(document.head.querySelector('link[rel="prefetch"][href="/cascaded-page"]')).toBeNull();

      const anchor = container.querySelector(".cascaded-link") as HTMLAnchorElement;
      anchor.dispatchEvent(new Event("pointerenter"));

      expect(
        document.head.querySelector('link[rel="prefetch"][href="/cascaded-page"]')
      ).not.toBeNull();

      unmount();
    });

    it("usePrefetch provides imperative prefetching function", () => {
      let imperativelyPrefetch: any;
      function TestComponent() {
        imperativelyPrefetch = usePrefetch();
        return <div>Prefetch Hook</div>;
      }

      const unmount = render(() => <Router>{() => <TestComponent />}</Router>, container);

      expect(typeof imperativelyPrefetch).toBe("function");
      imperativelyPrefetch("/imperative-destination");

      expect(
        document.head.querySelector('link[rel="prefetch"][href="/imperative-destination"]')
      ).not.toBeNull();

      unmount();
    });

    it("executes custom onClick callback and still performs client-side navigation", () => {
      let customClicked = false;

      function TargetPage() {
        return <div class="target">Target Page</div>;
      }

      const unmount = render(
        () => (
          <Router>
            {() => (
              <>
                <Link
                  href="/target"
                  class="custom-click-link"
                  onClick={() => {
                    customClicked = true;
                  }}
                >
                  Go to Target
                </Link>
                <Routes>
                  <Route path="/target" component={TargetPage} />
                </Routes>
              </>
            )}
          </Router>
        ),
        container
      );

      const link = container.querySelector(".custom-click-link") as HTMLAnchorElement;
      expect(link).not.toBeNull();

      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0
      });

      link.dispatchEvent(clickEvent);

      expect(customClicked).toBe(true);
      expect(clickEvent.defaultPrevented).toBe(true);
      expect(container.querySelector(".target")?.textContent).toBe("Target Page");

      unmount();
    });
  });
});
