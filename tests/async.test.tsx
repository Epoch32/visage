import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { createResource, ErrorBoundary, lazy, render, Suspense } from "../src";
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

  it("dynamically loads async components with lazy and Suspense", async () => {
    let resolveImport: (mod: any) => void;
    const importPromise = new Promise<{ default: (props: { title: string }) => any }>((res) => {
      resolveImport = res;
    });

    const LazyCard = lazy(() => importPromise);

    const unmount = render(
      () => (
        <Suspense fallback={<div class="lazy-loading">Loading chunk...</div>}>
          <LazyCard title="Analytics Dashboard" />
        </Suspense>
      ),
      container
    );

    expect(container.querySelector(".lazy-loading")).not.toBeNull();

    function Card(props: { title: string }) {
      return <div class="loaded-card">Card: {props.title}</div>;
    }

    resolveImport!({ default: Card });
    await importPromise;
    await new Promise((r) => setTimeout(r, 20));

    const card = container.querySelector(".loaded-card");
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain("Analytics Dashboard");

    unmount();
  });

  it("supports preloading lazy components via LazyComponent.preload()", async () => {
    let importCalled = false;
    function SettingsPanel() {
      return <div class="settings-panel">Settings</div>;
    }

    const LazySettings = lazy(async () => {
      importCalled = true;
      return { default: SettingsPanel };
    });

    expect(importCalled).toBe(false);
    const preloaded = await LazySettings.preload();
    expect(importCalled).toBe(true);
    expect(typeof preloaded).toBe("function");

    const unmount = render(
      () => (
        <Suspense fallback={<div>Loading...</div>}>
          <LazySettings />
        </Suspense>
      ),
      container
    );

    expect(container.querySelector(".settings-panel")).not.toBeNull();
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
