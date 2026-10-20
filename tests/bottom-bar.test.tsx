import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import { render } from "../src";
import { signal } from "../src/signals";
import {
  BottomBar,
  BottomBarAction,
  BottomBarBadge,
  BottomBarItem,
  BottomBarSeparator
} from "../src/ui";

describe("BottomBar Component Primitives", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.innerHTML = "";
    document.body.appendChild(container);
  });

  it("renders with default floating variant and ARIA attributes", () => {
    render(
      () => (
        <BottomBar defaultValue="home">
          {() => (
            <>
              <BottomBar.Item value="home" label="Home" />
              <BottomBar.Item value="profile" label="Profile" />
            </>
          )}
        </BottomBar>
      ),
      container
    );

    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();
    expect(nav?.getAttribute("role")).toBe("tablist");
    expect(nav?.getAttribute("aria-label")).toBe("Mobile navigation");
    expect(nav?.getAttribute("data-variant")).toBe("floating");

    const items = container.querySelectorAll("button[role='tab']");
    expect(items.length).toBe(2);
    expect(items[0]?.getAttribute("aria-selected")).toBe("true");
    expect(items[0]?.getAttribute("data-state")).toBe("active");
    expect(items[1]?.getAttribute("aria-selected")).toBe("false");
    expect(items[1]?.getAttribute("data-state")).toBe("inactive");
  });

  it("switches active item reactively when clicked", () => {
    const active = signal("home");
    render(
      () => (
        <BottomBar value={active} onValueChange={(val) => active.set(val)}>
          {() => (
            <>
              <BottomBar.Item value="home" label="Home" />
              <BottomBar.Item value="explore" label="Explore" />
              <BottomBar.Item value="profile" label="Profile" />
            </>
          )}
        </BottomBar>
      ),
      container
    );

    const items = container.querySelectorAll("button[role='tab']");
    expect(items[0]?.getAttribute("data-state")).toBe("active");
    expect(items[1]?.getAttribute("data-state")).toBe("inactive");

    // Click second item
    (items[1] as HTMLButtonElement).click();
    expect(active()).toBe("explore");
    expect(items[0]?.getAttribute("data-state")).toBe("inactive");
    expect(items[1]?.getAttribute("data-state")).toBe("active");
  });

  it("supports shorthand items array configuration", () => {
    let selected = "home";
    render(
      () => (
        <BottomBar
          defaultValue="home"
          onValueChange={(v) => {
            selected = v;
          }}
          items={[
            { value: "home", label: "Home" },
            { value: "search", label: "Search" },
            { value: "notifications", label: "Alerts", badge: 5 }
          ]}
        />
      ),
      container
    );

    const items = container.querySelectorAll("button[role='tab']");
    expect(items.length).toBe(3);
    expect(items[0]?.textContent).toContain("Home");
    expect(items[2]?.textContent).toContain("Alerts");
    expect(items[2]?.textContent).toContain("5");

    (items[1] as HTMLButtonElement).click();
    expect(selected).toBe("search");
  });

  it("renders action button and separator correctly", () => {
    let actionTriggered = false;
    render(
      () => (
        <BottomBar defaultValue="home">
          {() => (
            <>
              <BottomBarItem value="home" label="Home" />
              <BottomBarSeparator />
              <BottomBarAction
                label="Add item"
                icon={<span>+</span>}
                onClick={() => {
                  actionTriggered = true;
                }}
              />
              <BottomBarItem value="settings" label="Settings" />
            </>
          )}
        </BottomBar>
      ),
      container
    );

    const action = container.querySelector(".visage-bottom-bar-action") as HTMLButtonElement;
    expect(action).not.toBeNull();
    expect(action.getAttribute("aria-label")).toBe("Add item");
    action.click();
    expect(actionTriggered).toBe(true);

    const separator = container.querySelector(".visage-bottom-bar-separator");
    expect(separator).not.toBeNull();
    expect(separator?.getAttribute("role")).toBe("separator");
  });

  it("renders docked variant with proper data attributes and styles", () => {
    render(
      () => (
        <BottomBar variant="docked" defaultValue="feed">
          {() => (
            <>
              <BottomBar.Item value="feed" label="Feed" />
              <BottomBar.Item value="saved" label="Saved" />
            </>
          )}
        </BottomBar>
      ),
      container
    );

    const nav = container.querySelector("nav");
    expect(nav?.getAttribute("data-variant")).toBe("docked");
    expect(nav?.classList.contains("visage-bottom-bar-docked")).toBe(true);
  });

  it("supports reactive badge updates", () => {
    const unread = signal(2);
    render(
      () => (
        <BottomBar defaultValue="chat">
          {() => (
            <BottomBarItem value="chat" label="Chat">
              <BottomBarBadge count={unread} />
            </BottomBarItem>
          )}
        </BottomBar>
      ),
      container
    );

    const badge = container.querySelector(".visage-bottom-bar-badge");
    expect(badge?.textContent).toBe("2");

    unread.set(7);
    expect(badge?.textContent).toBe("7");
  });
});
