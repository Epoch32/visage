/** @jsxImportSource visage */
import { computed, For, Show, signal, VisageDevTools } from "visage";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

interface AdminMetrics {
  adminUser: string;
  stats: {
    totalTodos: number;
    completedTodos: number;
    pendingTodos: number;
    completionRate: number;
  };
  memoryMb: number;
}

export function App() {
  const todos = signal<Todo[]>([]);
  const newTodoTitle = signal("");
  const isLoading = signal(false);
  const errorMsg = signal<string | null>(null);

  // Admin state
  const adminToken = signal("Bearer super-secret-admin-key");
  const adminMetrics = signal<AdminMetrics | null>(null);
  const adminError = signal<string | null>(null);
  const sseEvents = signal<Array<{ timestamp: string; event: string; count: number }>>([]);
  const isStreaming = signal(false);

  // Computed stats
  const completedCount = computed(() => todos().filter((t) => t.completed).length);
  const totalCount = computed(() => todos().length);

  // Fetch initial todos
  const loadTodos = async () => {
    isLoading.set(true);
    errorMsg.set(null);
    try {
      const res = await fetch("/api/todos");
      const json = await res.json();
      if (json.ok) {
        todos.set(json.data);
      } else {
        errorMsg.set(json.error?.message || "Failed to load todos");
      }
    } catch (e: any) {
      errorMsg.set(e.message);
    } finally {
      isLoading.set(false);
    }
  };

  const addTodo = async (e: Event) => {
    e.preventDefault();
    const title = newTodoTitle().trim();
    if (!title) return;

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      const json = await res.json();
      if (json.ok) {
        todos.update((prev) => [...prev, json.data.todo]);
        newTodoTitle.set("");
      }
    } catch (e: any) {
      errorMsg.set(e.message);
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed })
      });
      const json = await res.json();
      if (json.ok) {
        todos.update((prev) =>
          prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
        );
      }
    } catch (e: any) {
      errorMsg.set(e.message);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        todos.update((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (e: any) {
      errorMsg.set(e.message);
    }
  };

  const fetchAdminMetrics = async () => {
    adminError.set(null);
    try {
      const res = await fetch("/api/admin/metrics", {
        headers: { Authorization: adminToken() }
      });
      const json = await res.json();
      if (json.ok) {
        adminMetrics.set(json.data);
      } else {
        adminError.set(`[HTTP ${res.status}] ${json.error?.message}`);
        adminMetrics.set(null);
      }
    } catch (e: any) {
      adminError.set(e.message);
    }
  };

  const startSseStream = () => {
    if (isStreaming()) return;
    isStreaming.set(true);
    sseEvents.set([]);

    const eventSource = new EventSource("/api/admin/events");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        sseEvents.update((prev) => [data, ...prev.slice(0, 9)]);
      } catch (err) {
        console.error("SSE Parse Error:", err);
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
      isStreaming.set(false);
    };
  };

  // Initial load
  loadTodos();

  return (
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #f4f4f5; min-height: 100vh; padding: 2.5rem;">
      <header style="max-width: 900px; margin: 0 auto 2.5rem auto; border-bottom: 1px solid #27272a; padding-bottom: 1.5rem;">
        <h1 style="font-size: 2rem; font-weight: 700; margin: 0 0 0.5rem 0; letter-spacing: -0.03em;">
          Visage Full-Stack API Showcase
        </h1>
        <p style="color: #a1a1aa; font-size: 1rem; margin: 0;">
          File-based RPC routing, directive pragma middleware cascades, and real-time SSE streaming.
        </p>
      </header>

      <main style="max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        {/* Left Column: Public / User Todos */}
        <section style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.25rem; font-weight: 600; margin: 0;">
              Reactive Todos (/api/todos)
            </h2>
            <span style="background: #27272a; color: #a1a1aa; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 9999px;">
              {() => `${completedCount()}/${totalCount()} done`}
            </span>
          </div>

          <form onSubmit={addTodo} style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
            <input
              type="text"
              placeholder="Add a new full-stack task..."
              value={() => newTodoTitle()}
              onInput={(e: any) => newTodoTitle.set(e.target.value)}
              style="flex: 1; background: #09090b; border: 1px solid #3f3f46; color: #fff; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.875rem;"
            />
            <button
              type="submit"
              style="background: #3b82f6; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 500; cursor: pointer;"
            >
              Add
            </button>
          </form>

          <Show when={() => errorMsg() !== null}>
            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 0.75rem; border-radius: 6px; font-size: 0.875rem; margin-bottom: 1rem;">
              {() => errorMsg()}
            </div>
          </Show>

          <Show
            when={() => isLoading()}
            fallback={
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <For each={() => todos()}>
                  {(todo) => (
                    <div style="display: flex; align-items: center; justify-content: space-between; background: #09090b; border: 1px solid #27272a; padding: 0.75rem; border-radius: 8px;">
                      <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; flex: 1;">
                        <input
                          type="checkbox"
                          checked={() => todo.completed}
                          onChange={() => toggleTodo(todo.id, todo.completed)}
                        />
                        <span
                          style={() =>
                            todo.completed
                              ? "text-decoration: line-through; color: #71717a;"
                              : "color: #f4f4f5;"
                          }
                        >
                          {todo.title}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => deleteTodo(todo.id)}
                        style="background: transparent; border: none; color: #71717a; cursor: pointer; font-size: 1rem; padding: 0 0.5rem;"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </For>
              </div>
            }
          >
            <div style="color: #a1a1aa; font-size: 0.875rem; text-align: center; padding: 2rem 0;">
              Loading todos from /api/todos...
            </div>
          </Show>
        </section>

        {/* Right Column: Guarded Admin Family */}
        <section style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 1.5rem;">
          <div style="margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.25rem; font-weight: 600; margin: 0 0 0.25rem 0;">
              Guarded Admin Family (/api/admin/*)
            </h2>
            <p style="font-size: 0.75rem; color: #71717a; margin: 0;">
              Protected by <code>admin/_middleware.ts</code> (directive pragma: cascade: true)
            </p>
          </div>

          <div style="margin-bottom: 1.25rem;">
            <label style="font-size: 0.75rem; color: #a1a1aa; display: block; margin-bottom: 0.35rem;">
              Authorization Header:
              <input
                type="text"
                value={() => adminToken()}
                onInput={(e: any) => adminToken.set(e.target.value)}
                style="width: 100%; box-sizing: border-box; background: #09090b; border: 1px solid #3f3f46; color: #fff; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.8rem; font-family: monospace; margin-top: 0.35rem;"
              />
            </label>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
            <button
              type="button"
              onClick={fetchAdminMetrics}
              style="flex: 1; background: #10b981; color: #fff; border: none; padding: 0.5rem; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 0.875rem;"
            >
              Query Metrics
            </button>
            <button
              type="button"
              onClick={startSseStream}
              disabled={() => isStreaming()}
              style="flex: 1; background: #6366f1; color: #fff; border: none; padding: 0.5rem; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 0.875rem;"
            >
              <Show when={() => isStreaming()} fallback="Start SSE Stream">
                <span>Streaming SSE...</span>
              </Show>
            </button>
          </div>

          <Show when={() => adminError() !== null}>
            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 0.75rem; border-radius: 6px; font-size: 0.8rem; margin-bottom: 1rem;">
              {() => adminError()}
            </div>
          </Show>

          <Show when={() => adminMetrics() !== null}>
            <div style="background: #09090b; border: 1px solid #27272a; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
              <div style="font-size: 0.75rem; color: #10b981; font-weight: 600; margin-bottom: 0.5rem;">
                ✓ Authenticated as: {() => adminMetrics()?.adminUser}
              </div>
              <div style="font-size: 0.8rem; color: #d4d4d8; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <div>Total Todos: {() => adminMetrics()?.stats.totalTodos}</div>
                <div>Completed: {() => adminMetrics()?.stats.completedTodos}</div>
                <div>Completion Rate: {() => `${adminMetrics()?.stats.completionRate}%`}</div>
                <div>Heap Memory: {() => `${adminMetrics()?.memoryMb} MB`}</div>
              </div>
            </div>
          </Show>

          <Show when={() => sseEvents().length > 0}>
            <div style="background: #09090b; border: 1px solid #27272a; padding: 0.75rem; border-radius: 8px;">
              <div style="font-size: 0.75rem; color: #a1a1aa; margin-bottom: 0.5rem;">
                Real-Time SSE Events:
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.35rem; max-height: 150px; overflow-y: auto;">
                <For each={() => sseEvents()}>
                  {(evt) => (
                    <div style="font-family: monospace; font-size: 0.75rem; color: #818cf8;">
                      [{evt.timestamp}] {evt.event} #{evt.count}
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </section>
      </main>

      {/* Floating DevTools */}
      <VisageDevTools initialOpen={false} />
    </div>
  );
}
