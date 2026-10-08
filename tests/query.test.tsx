import { beforeEach, describe, expect, it } from "bun:test";
import { render, Suspense } from "../src/dom";
import {
  createInfiniteQuery,
  createMutation,
  createQuery,
  focusManager,
  hashKey,
  onlineManager,
  QueryClient,
  QueryClientProvider,
  sleep,
  useQueryClient
} from "../src/query";
import { createRoot, signal } from "../src/signals";
import { setupDOM } from "./dom-mock";

describe("Visage Query & Cache Manager (visage/query)", () => {
  beforeEach(() => {
    setupDOM();
    focusManager.setFocused(true);
    onlineManager.setOnline(true);
  });

  it("hashes query keys deterministically regardless of object key order", () => {
    const key1 = ["users", { id: 1, filter: "active" }];
    const key2 = ["users", { filter: "active", id: 1 }];

    expect(hashKey(key1)).toBe(hashKey(key2));
    expect(hashKey(["todos", 1])).toBe('["todos",1]');
  });

  it("fetches, caches, and reads data via QueryClient", async () => {
    const client = new QueryClient();
    let fetchCount = 0;

    const data1 = await client.fetchQuery({
      queryKey: ["greeting"],
      queryFn: async () => {
        fetchCount++;
        return "Hello Visage";
      },
      staleTime: 5000
    });

    expect(data1).toBe("Hello Visage");
    expect(fetchCount).toBe(1);
    expect(client.getQueryData(["greeting"])).toBe("Hello Visage");

    // Second fetch with fresh cache should not call queryFn again
    const data2 = await client.fetchQuery({
      queryKey: ["greeting"],
      queryFn: async () => {
        fetchCount++;
        return "Hello Again";
      },
      staleTime: 5000
    });

    expect(data2).toBe("Hello Visage");
    expect(fetchCount).toBe(1);
  });

  it("supports hierarchical prefix cache invalidation", async () => {
    const client = new QueryClient();
    let issue1Fetches = 0;
    let issue2Fetches = 0;
    let userFetches = 0;

    createRoot(() => {
      createQuery(
        {
          queryKey: ["issues", 1],
          queryFn: async () => {
            issue1Fetches++;
            return { id: 1, title: "Issue 1" };
          }
        },
        client
      );

      createQuery(
        {
          queryKey: ["issues", 2],
          queryFn: async () => {
            issue2Fetches++;
            return { id: 2, title: "Issue 2" };
          }
        },
        client
      );

      createQuery(
        {
          queryKey: ["users", "me"],
          queryFn: async () => {
            userFetches++;
            return { name: "Hazel" };
          }
        },
        client
      );
    });

    await sleep(20);

    expect(issue1Fetches).toBe(1);
    expect(issue2Fetches).toBe(1);
    expect(userFetches).toBe(1);

    // Invalidate all queries starting with ["issues"]
    await client.invalidateQueries({ queryKey: ["issues"] });

    expect(issue1Fetches).toBe(2);
    expect(issue2Fetches).toBe(2);
    expect(userFetches).toBe(1); // untouched
  });

  it("reactively updates state when signal query key changes", async () => {
    const client = new QueryClient();
    const id = signal(1);
    let lastFetchedId = 0;

    const query = createRoot(() =>
      createQuery(
        () => ({
          queryKey: ["item", id()],
          queryFn: async () => {
            const current = id();
            lastFetchedId = current;
            await sleep(5);
            return `Item #${current}`;
          }
        }),
        client
      )
    );

    expect(query.isLoading()).toBe(true);
    await sleep(15);

    expect(query.isSuccess()).toBe(true);
    expect(query.data()).toBe("Item #1");
    expect(lastFetchedId).toBe(1);

    // Change signal
    id.set(2);
    await sleep(15);

    expect(query.data()).toBe("Item #2");
    expect(lastFetchedId).toBe(2);
  });

  it("supports transform selection with select option", async () => {
    const client = new QueryClient();

    const query = createRoot(() =>
      createQuery(
        {
          queryKey: ["userProfile"],
          queryFn: async () => ({
            id: 42,
            profile: { firstName: "Alan", lastName: "Turing" }
          }),
          select: (data) => `${data.profile.firstName} ${data.profile.lastName}`
        },
        client
      )
    );

    await sleep(10);
    expect(query.data()).toBe("Alan Turing");
  });

  it("triggers automatic garbage collection when observers disconnect", async () => {
    const client = new QueryClient();
    let disposeObserver: () => void = () => {};

    createRoot((dispose) => {
      disposeObserver = dispose;
      createQuery(
        {
          queryKey: ["tempData"],
          queryFn: async () => "temporary",
          gcTime: 20 // 20ms GC
        },
        client
      );
    });

    await sleep(5);
    expect(client.getQueryData(["tempData"])).toBe("temporary");

    // Dispose observer
    disposeObserver();

    // Query should still exist before gcTime
    expect(client.getQueryData(["tempData"])).toBe("temporary");

    // Wait for gcTime to expire
    await sleep(30);

    expect(client.getQueryData(["tempData"])).toBe(undefined);
  });

  it("revalidates stale queries on window focus and reconnect", async () => {
    const client = new QueryClient();
    let fetchCount = 0;

    createRoot(() => {
      createQuery(
        {
          queryKey: ["liveClock"],
          queryFn: async () => {
            fetchCount++;
            return Date.now();
          },
          staleTime: 0,
          refetchOnWindowFocus: true,
          refetchOnReconnect: true
        },
        client
      );
    });

    await sleep(5);
    expect(fetchCount).toBe(1);

    // Simulate focus
    focusManager.setFocused(true);
    await sleep(5);
    expect(fetchCount).toBe(2);

    // Simulate reconnect
    onlineManager.setOnline(true);
    await sleep(5);
    expect(fetchCount).toBe(3);
  });

  it("handles optimistic mutations with rollback on failure", async () => {
    const client = new QueryClient();
    client.setQueryData(["todos"], ["Todo 1", "Todo 2"]);

    let shouldFail = true;

    const mutation = createRoot(() =>
      createMutation<string[], Error, string, { previousTodos: string[] }>(
        {
          mutationFn: async (newTodo: string) => {
            await sleep(5);
            if (shouldFail) {
              throw new Error("Network failure");
            }
            return [...client.getQueryData<string[]>(["todos"])!, newTodo];
          },
          onMutate: async (newTodo: string) => {
            const previousTodos = client.getQueryData<string[]>(["todos"]) ?? [];
            // Optimistically update
            client.setQueryData(["todos"], [...previousTodos, newTodo]);
            return { previousTodos };
          },
          onError: (_err, _newTodo, context) => {
            // Rollback
            if (context?.previousTodos) {
              client.setQueryData(["todos"], context.previousTodos);
            }
          }
        },
        client
      )
    );

    expect(client.getQueryData(["todos"])).toEqual(["Todo 1", "Todo 2"]);

    // Attempt mutation that will fail
    try {
      await mutation.mutateAsync("Optimistic Todo");
    } catch {
      // Expected error
    }

    expect(mutation.isError()).toBe(true);
    // Rolled back successfully!
    expect(client.getQueryData(["todos"])).toEqual(["Todo 1", "Todo 2"]);

    // Now let mutation succeed
    shouldFail = false;
    await mutation.mutateAsync("Successful Todo");

    expect(mutation.isSuccess()).toBe(true);
    expect(client.getQueryData(["todos"])).toEqual(["Todo 1", "Todo 2", "Successful Todo"]);
  });

  it("handles infinite query pagination with createInfiniteQuery", async () => {
    const client = new QueryClient();

    const infinite = createRoot(() =>
      createInfiniteQuery(
        {
          queryKey: ["infiniteItems"],
          initialPageParam: 0,
          queryFn: async ({ pageParam }: { pageParam?: number }) => {
            const cursor = pageParam ?? 0;
            return {
              items: [`Item ${cursor * 2 + 1}`, `Item ${cursor * 2 + 2}`],
              nextCursor: cursor < 2 ? cursor + 1 : undefined
            };
          },
          getNextPageParam: (lastPage: { items: string[]; nextCursor?: number }) =>
            lastPage.nextCursor
        },
        client
      )
    );

    await sleep(10);

    expect(infinite.data()?.pages.length).toBe(1);
    expect(infinite.data()?.pages[0]?.items).toEqual(["Item 1", "Item 2"]);
    expect(infinite.hasNextPage()).toBe(true);

    // Fetch page 2
    await infinite.fetchNextPage();

    expect(infinite.data()?.pages.length).toBe(2);
    expect(infinite.data()?.pages[1]?.items).toEqual(["Item 3", "Item 4"]);
    expect(infinite.hasNextPage()).toBe(true);

    // Fetch page 3 (last page)
    await infinite.fetchNextPage();

    expect(infinite.data()?.pages.length).toBe(3);
    expect(infinite.data()?.pages[2]?.items).toEqual(["Item 5", "Item 6"]);
    expect(infinite.hasNextPage()).toBe(false);
  });

  it("integrates seamlessly with Suspense and direct DOM rendering", async () => {
    const client = new QueryClient();
    const container = document.createElement("div");

    const query = createQuery(
      {
        queryKey: ["profile"],
        queryFn: async () => {
          await sleep(15);
          return "Grace Hopper";
        },
        suspense: true
      },
      client
    );

    const unmount = render(
      () => (
        <Suspense fallback={<div id="loading">Loading Profile...</div>}>
          {() => (
            <div id="user-profile">
              <span>{query}</span>
            </div>
          )}
        </Suspense>
      ),
      container
    );

    expect(container.innerHTML).toContain("Loading Profile...");

    await sleep(25);

    expect(container.innerHTML).toContain("Grace Hopper");
    unmount();
  });

  it("provides and consumes custom QueryClient via QueryClientProvider", async () => {
    const customClient = new QueryClient();
    customClient.setQueryData(["scopedKey"], "Scoped Value");

    let retrievedClient: QueryClient | null = null;
    let dataValue: string | undefined;

    function ChildComponent() {
      retrievedClient = useQueryClient();
      const query = createQuery<string>({
        queryKey: ["scopedKey"],
        queryFn: async () => "Fetched"
      });
      dataValue = query.data();
      return <div>{query}</div>;
    }

    const container = document.createElement("div");
    const unmount = render(
      () => (
        <QueryClientProvider client={customClient}>{() => <ChildComponent />}</QueryClientProvider>
      ),
      container
    );

    expect(retrievedClient).toBe(customClient);
    expect(dataValue).toBe("Scoped Value");
    unmount();
  });

  it("supports placeholderData while loading", async () => {
    const client = new QueryClient();

    const query = createRoot(() =>
      createQuery(
        {
          queryKey: ["placeholderTest"],
          queryFn: async () => {
            await sleep(10);
            return "Real Value";
          },
          placeholderData: "Initial Placeholder"
        },
        client
      )
    );

    expect(query.data()).toBe("Initial Placeholder");
    expect(query.isLoading()).toBe(true);

    await sleep(20);

    expect(query.data()).toBe("Real Value");
    expect(query.isSuccess()).toBe(true);
  });

  it("supports enabled: false with manual refetch()", async () => {
    const client = new QueryClient();
    let calls = 0;

    const query = createRoot(() =>
      createQuery(
        {
          queryKey: ["disabledQuery"],
          queryFn: async () => {
            calls++;
            return `Call #${calls}`;
          },
          enabled: false
        },
        client
      )
    );

    await sleep(10);
    expect(calls).toBe(0);
    expect(query.data()).toBe(undefined);
    expect(query.fetchStatus()).toBe("idle");

    const res = await query.refetch();
    expect(res).toBe("Call #1");
    expect(calls).toBe(1);
    expect(query.data()).toBe("Call #1");
  });

  it("supports periodic polling with refetchInterval", async () => {
    const client = new QueryClient();
    let pollCount = 0;

    const unmount = createRoot((dispose) => {
      createQuery(
        {
          queryKey: ["polledData"],
          queryFn: async () => {
            pollCount++;
            return pollCount;
          },
          refetchInterval: 15,
          refetchIntervalInBackground: true
        },
        client
      );
      return dispose;
    });

    await sleep(5);
    expect(pollCount).toBe(1);

    await sleep(20);
    expect(pollCount >= 2).toBe(true);

    unmount();
  });
});
