import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { ErrorBoundary, Suspense, createResource, render } from "../src";
import { signal } from "../src/signals";

describe("Visage Async & Error Primitives", () => {
  let container: any;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("handles async resources with createResource and Suspense", async () => {
    let resolveFetch: (val: string) => void;
    const fetchPromise = new Promise<string>((res) => {
      resolveFetch = res;
    });

    const userResource = createResource(() => fetchPromise);

    const unmount = render(
      () => (
        <Suspense fallback={<div class="loading">Loading user...</div>}>
          {() => <div class="user-profile">User: {userResource}</div>}
        </Suspense>
      ),
      container
    );

    expect(container.querySelector(".loading")).not.toBeNull();

    resolveFetch!("Alice");
    await fetchPromise;
    await new Promise((r) => setTimeout(r, 20));

    expect(container.querySelector(".user-profile")?.textContent).toContain("Alice");
    unmount();
  });

  it("catches errors gracefully in ErrorBoundary", () => {
    const shouldCrash = signal(false);

    function BuggyComponent() {
      if (shouldCrash()) {
        throw new Error("Simulated crash!");
      }
      return <div class="good">All good</div>;
    }

    const unmount = render(
      () => (
        <ErrorBoundary fallback={(err) => <div class="error-msg">Caught: {err.message}</div>}>
          {() => <BuggyComponent />}
        </ErrorBoundary>
      ),
      container
    );

    expect(container.querySelector(".good")).not.toBeNull();

    shouldCrash.set(true);
    expect(container.querySelector(".error-msg")?.textContent).toContain("Simulated crash!");

    unmount();
  });
});
