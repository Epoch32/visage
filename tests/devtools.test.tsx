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
    devtoolsHub.clearAll();
  });

  it("registers and tracks reactive signals and computed values", () => {
    const count = signal(42, { internal: true });
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
    expect(container.querySelector(".visage-devtools-drawer")).toBeNull();

    // Toggle open
    trigger.click();
    expect(devtoolsHub.isOpen()).toBe(true);

    const drawer = container.querySelector(".visage-devtools-drawer");
    expect(drawer).not.toBeNull();

    // Switch tabs using TabsTrigger
    const tabTriggers = container.querySelectorAll('[role="tab"]');
    expect(tabTriggers.length > 1).toBe(true);
    (tabTriggers[2] as HTMLButtonElement).click();
    expect(devtoolsHub.activeTab()).toBe("query");

    unmount();
  });

  it("selects list items on click and renders details pane reactively", () => {
    devtoolsHub.clearAll();
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

    const itemRows = Array.from(
      container.querySelectorAll(".visage-devtools-item")
    ) as HTMLElement[];
    const itemRow = itemRows.find((el) => el.textContent?.includes("themePreference"));
    expect(itemRow).toBeDefined();
    expect(itemRow?.textContent).toContain("themePreference");

    // Click item row to inspect
    itemRow?.click();

    const detailBox = container.querySelector(".visage-devtools-main");
    expect(detailBox).not.toBeNull();
    expect(detailBox?.textContent).toContain("themePreference");
    expect(detailBox?.textContent).toContain('"dark"');

    unmount();
    devtoolsHub.unregisterSignal(sigId);
  });

  it("renders the Live DAG Graph Tab with reactive nodes and dependency linkages", () => {
    devtoolsHub.clearAll();
    const sourceId = devtoolsHub.registerSignal({
      id: "sig_source_1",
      name: "itemPrice",
      type: "signal",
      getValue: () => 100,
      version: () => 1,
      dependents: () => ["sig_computed_1"]
    });

    const computedId = devtoolsHub.registerSignal({
      id: "sig_computed_1",
      name: "taxAmount",
      type: "computed",
      getValue: () => 20,
      version: () => 1,
      dependencies: () => ["sig_source_1"]
    });

    const unmount = render(
      () => <VisageDevTools initialOpen={true} initialTab="graph" />,
      container
    );

    const graphContainer = container.querySelector(".visage-graph-container");
    expect(graphContainer).not.toBeNull();

    const nodes = container.querySelectorAll(".visage-graph-node");
    expect(nodes.length).toBe(2);

    // Click computed node to inspect its upstream inputs
    (nodes[1] as HTMLElement).click();
    const inspector = container.querySelector(".visage-devtools-json");
    expect(inspector?.textContent).toContain("20");

    const pill = container.querySelector(".visage-graph-pill.source") as HTMLElement;
    expect(pill).not.toBeNull();
    expect(pill.textContent).toContain("itemPrice");

    unmount();
    devtoolsHub.unregisterSignal(sourceId);
    devtoolsHub.unregisterSignal(computedId);
  });
});
