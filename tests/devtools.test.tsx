import { beforeEach, describe, expect, it } from "bun:test";
import { devtoolsHub, VisageDevTools } from "../src/devtools";
import { render } from "../src/dom";
import { QueryClient } from "../src/query";
import { signal } from "../src/signals";
import { setupDom } from "./dom-mock";

describe("Visage In-Browser DevTools & Reactive Inspector (visage/devtools)", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    setupDom();
    container = document.createElement("div");
    document.body.appendChild(container);
    devtoolsHub.clearLogs();
  });

  it("registers and tracks reactive signals and computed values", () => {
    const count = signal(42);
    const sigId = devtoolsHub.registerSignal({
      name: "counterSignal",
      type: "signal",
      getValue: () => count(),
      version: () => 1
    });

    expect(devtoolsHub.signalsList().length > 0).toBe(true);
    const record = devtoolsHub.signalsList().find((s) => s.id === sigId);
    expect(record?.name).toBe("counterSignal");
    expect(record?.getValue()).toBe(42);

    devtoolsHub.unregisterSignal(sigId);
    expect(devtoolsHub.signalsList().find((s) => s.id === sigId)).toBe(undefined);
  });

  it("attaches to QueryClient and syncs active queries in cache", async () => {
    const client = new QueryClient();
    devtoolsHub.attachQueryClient(client);

    await client.fetchQuery({
      queryKey: ["users", "list"],
      queryFn: async () => [{ id: "1", name: "Alice" }]
    });

    const queries = devtoolsHub.queriesList();
    expect(queries.length).toBe(1);
    expect(queries[0]?.key).toEqual(["users", "list"]);
    expect(queries[0]?.data()).toEqual([{ id: "1", name: "Alice" }]);
  });

  it("logs RPC calls, status updates, and SSE stream payloads", () => {
    const logId = devtoolsHub.logRpcCall({
      id: "rpc_test_1",
      path: "getStats",
      type: "query",
      input: { surveyId: "123" }
    });

    expect(devtoolsHub.rpcLogs().length).toBe(1);
    expect(devtoolsHub.rpcLogs()[0]?.status).toBe("pending");

    devtoolsHub.updateRpcCall(logId, {
      status: "success",
      response: { totalResponses: 10 }
    });

    expect(devtoolsHub.rpcLogs()[0]?.status).toBe("success");
    expect(devtoolsHub.rpcLogs()[0]?.response).toEqual({ totalResponses: 10 });

    // Stream SSE events
    devtoolsHub.logRpcEvent(logId, { newSubmissionId: "sub_99" });
    expect(devtoolsHub.rpcLogs()[0]?.events?.length).toBe(1);
  });

  it("renders VisageDevTools floating launcher and expands drawer on toggle", () => {
    const unmount = render(() => <VisageDevTools initialOpen={false} />, container);

    const trigger = container.querySelector(".visage-devtools-trigger") as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(container.querySelector(".visage-devtools-panel")).toBeNull();

    // Toggle open
    trigger.click();
    expect(devtoolsHub.isOpen()).toBe(true);

    const panel = container.querySelector(".visage-devtools-panel");
    expect(panel).not.toBeNull();

    // Switch tabs
    const queryTabBtn = container.querySelectorAll(".tab-btn")[1] as HTMLButtonElement;
    queryTabBtn.click();
    expect(devtoolsHub.activeTab()).toBe("query");

    unmount();
  });

  it("selects list items on click and renders details pane reactively", () => {
    const sigId = devtoolsHub.registerSignal({
      id: "sig_custom_1",
      name: "themePreference",
      type: "signal",
      getValue: () => "dark",
      version: () => 1
    });

    const unmount = render(
      () => <VisageDevTools initialOpen={true} initialTab="signals" />,
      container
    );

    const itemRow = container.querySelector(".item-row") as HTMLButtonElement;
    expect(itemRow).not.toBeNull();
    expect(itemRow.textContent).toContain("themePreference");

    // Click item row to inspect
    itemRow.click();

    const detailContent = container.querySelector(".detail-content");
    expect(detailContent).not.toBeNull();
    expect(detailContent?.textContent).toContain("themePreference");
    expect(detailContent?.textContent).toContain('"dark"');

    unmount();
    devtoolsHub.unregisterSignal(sigId);
  });

  it("toggles Highlight DOM button and reacts to mutation highlighting", () => {
    const unmount = render(
      () => <VisageDevTools initialOpen={true} highlightDOM={false} />,
      container
    );

    const highlightBtn = container.querySelector(".btn-toggle-highlight") as HTMLButtonElement;
    expect(highlightBtn).not.toBeNull();
    expect(devtoolsHub.highlightDOM()).toBe(false);

    highlightBtn.click();
    expect(devtoolsHub.highlightDOM()).toBe(true);
    expect(highlightBtn.classList.contains("active")).toBe(true);

    highlightBtn.click();
    expect(devtoolsHub.highlightDOM()).toBe(false);
    expect(highlightBtn.classList.contains("active")).toBe(false);

    unmount();
  });
});
