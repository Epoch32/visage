# @epoch32/compute — Mathematical Formalism & Invariants

## 1. Topological Derivations & Graph Coloring
Let $G = (V, E)$ be a directed acyclic graph where vertices $V = P \cup C$:
- $P$: primary producers (`Signal.State`)
- $C$: derived consumers/producers (`Signal.Computed`)

### 1.1 Glitch Freedom Theorem
Let $A \in P$ be modified at time $t$. Let $D \in C$ be a node with multiple directed paths from $A$.
Under push-pull topological evaluation, for any pull on $D$, every path $A \rightsquigarrow D$ is traversed such that all intermediate computations $u \in \text{path}(A, D)$ reach $\Phi(u) = \text{CLEAN}$ before $D$ evaluates.
Hence:
$$\forall \text{ read}(D): D \text{ observes state congruent with atomic commit } A_t.$$

### 1.2 Algorithmic Complexity
- **Memoized Read**: $O(1)$ time, $0$ allocations.
- **Topological Check**: $O(|\text{deps}(v)|)$ link iterations without evaluation if upstream unchanged.
- **Recomputation**: $O(|\text{active\_deps}(v)| + \text{cost}(f))$.
