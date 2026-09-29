# Signal Mathematical Formalism & Invariants

> **Epoch32 Track 2, Week 01**: Zero-Allocation Reactive Cell Substrate

---

## 1. Graph Model

Let the reactive state graph be defined as a directed acyclic multigraph:

$$\mathcal{G} = (\mathcal{V}, \mathcal{E})$$

where the vertex set $\mathcal{V}$ is partitioned into two disjoint subsets:

$$\mathcal{V} = \mathcal{P} \cup \mathcal{C}, \quad \mathcal{P} \cap \mathcal{C} = \emptyset$$

- $\mathcal{P}$: Set of atomic state producers (sources / cells).
- $\mathcal{C}$: Set of reactive consumers (derivations, effects, DOM binders).

A directed edge $e = (u, v) \in \mathcal{E}$ indicates that consumer $v \in \mathcal{C}$ depends on producer or intermediate node $u \in \mathcal{V}$.

---

## 2. Topological Monotonicity & Glitch-Freedom

### Definition 1 (Global Clock & Version Invariant)
Let $\tau \in \mathbb{N}$ denote the monotonic global transaction clock.
Each node $u \in \mathcal{V}$ maintains a version scalar $\mathcal{V}(u) \in \mathbb{N}$.

When a producer $p \in \mathcal{P}$ is mutated with value $x' \neq x$:

$$\mathcal{V}(p) \leftarrow \tau + 1, \quad \tau \leftarrow \tau + 1$$

### Theorem 1 (Glitch-Free Evaluation)
In any diamond subgraph where node $D \in \mathcal{C}$ depends on both $B$ and $C$, which both depend on $A$:

```
        A
       / \
      B   C
       \ /
        D
```

When $A$ transitions $A \to A'$, $D$ evaluates **exactly once** against the consistent snapshot $(B(A'), C(A'))$.
$D$ never observes the transient inconsistent state $(B(A'), C(A))$ or $(B(A), C(A'))$.

**Proof Outline:**
1. The push phase broadcasts bitmask flag $\text{DIRTY}$ along the topological DAG edges without invoking consumer calculation functions.
2. When consumer $D$ is triggered in the pull phase, $D$ checks upstream dependency versions.
3. Because $B$ and $C$ precede $D$ in topological order, their updates settle prior to $D$'s evaluation.
4. Hence, $D$ reads identical version epoch $\tau'$ across all incoming paths. $\blacksquare$

---

## 3. Algorithmic Complexity & Space Invariants

| Operation | Time Complexity | Heap Allocation (Steady State) |
| :--- | :--- | :--- |
| **`signal.get()`** (untracked) | $\mathcal{O}(1)$ | $0 \text{ bytes}$ |
| **`signal.get()`** (tracked) | $\mathcal{O}(1)$ amortized | $0 \text{ bytes}$ (recycled link pool) |
| **`signal.peek()`** | $\mathcal{O}(1)$ | $0 \text{ bytes}$ |
| **`signal.set(x)`** | $\mathcal{O}(k)$ where $k = \text{deg}^+(u)$ | $0 \text{ bytes}$ |
| **`batch(fn)`** | $\mathcal{O}(m)$ where $m = \text{total updates}$ | $0 \text{ bytes}$ |

### Memory Invariant:
Total heap footprint of the reactive graph is strictly bounded by:

$$\text{Memory}(\mathcal{G}) = \mathcal{O}(|\mathcal{V}| + |\mathcal{E}|)$$

No temporary arrays, sets, or closures are instantiated in the hot evaluation loops.
