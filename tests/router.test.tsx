import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { Link, Route, Router, Routes, render, useNavigate, useParams } from "../src";

describe("Visage Router", () => {
  let container: any;

  beforeEach(() => {
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

    // Navigate to /about
    navigateFn("/about");
    expect(container.querySelector(".home")).toBeNull();
    expect(container.querySelector(".about")?.textContent).toBe("About Page");

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
});
