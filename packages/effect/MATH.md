# @epoch32/effect — Mathematical Formalism & Scheduling Bounds

## 1. Asynchronous Graph Sinks & Coalescing Theorem

Let the reactive state graph be a DAG $G = (V, E)$, with producers $P \subset V$, intermediate derivations $C \subset V$, and reactive side-effect sinks $S \subset V$.

### 1.1 Coalesced Execution Invariant
Let $W = \langle w_1, w_2, \dots, w_k \rangle$ be a sequence of $k$ synchronous state mutations occurring at event loop tick $T$.
Let $s \in S$ be a sink observing a subset of producers modified in $W$:
$$\exists (u, s) \in E^* \text{ where } u \in \text{modified}(W)$$

Under the microtask batching queue:
$$\text{Executions}(s, T) = 1$$
Independent of the sequence length $k \ge 1$.

### 1.2 Upstream Memoization Filter
Let $c \in C$ be an intermediate derivation observed by $s \in S$, where $c = f(u)$.
If producer $u$ mutates such that $u \to u'$, but $f(u') = f(u)$, then:
$$\Delta \text{version}(c) = 0 \implies \text{checkDirty}(s) = \text{false}$$
Hence, the effect $s$ evaluates with an amortized overhead of $O(|\text{deps}(s)|)$ dependency version checks and $0$ effect re-runs.

### 1.3 Asymptotic Complexity
- **Scheduling**: $O(1)$ amortized insertion into the pending microtask queue.
- **Microtask Flush**: $O(M)$ where $M$ is the number of dirty scheduled sinks.
- **Teardown & Unlink**: $O(|\text{deps}(s)|)$ link removals.
- **Cycle Guard**: Bound $\kappa = 100$ iterations per tick, guaranteeing termination in finite steps $\le 100 \cdot |S|$.
