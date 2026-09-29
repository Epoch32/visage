# @epoch32/compute — Specification

## 1. Overview
`@epoch32/compute` provides lazy memoized derivations with dynamic dependency-ring cleanup and glitch-free topological evaluation for Visage (Track 2, Week 02).

## 2. Mathematical Formalism & Push-Pull Model
The reactive dependency graph is represented as a Directed Acyclic Graph (DAG) $G = (V, E)$ where vertices $V$ are reactive nodes (`SignalState` or `SignalComputed`) and directed edges $E \subseteq V \times V$ represent data flow dependencies $(u, v)$ where consumer $v$ reads producer $u$.

### 2.1 State Transitions
Each computed node possesses a bitmask flag $\Phi \in \{\text{CLEAN}, \text{CHECK\_DIRTY}, \text{DIRTY}, \text{RUNNING}, \text{DISPOSED}\}$:
1. **Push Phase**: When an upstream producer $u$ mutates, dirty notifications propagate down the DAG:
   $$\forall (u, v) \in E: \Phi(v) \leftarrow \Phi(v) \cup \{\text{CHECK\_DIRTY}\}$$
2. **Pull Phase**: When downstream consumer $v$ calls `.get()`:
   $$\text{if } \text{CHECK\_DIRTY} \in \Phi(v): \text{query } u \in \text{deps}(v)$$
   If no dependency's version changed, $\Phi(v) \leftarrow \text{CLEAN}$ without recomputation.
   If any dependency changed version, $v$ re-evaluates `fn()`.

## 3. Invariants
- **Glitch Freedom**: In any diamond topology ($A \to B, A \to C, B+C \to D$), reading $D$ evaluates $B$ and $C$ in topological order, guaranteeing $D$ evaluates at most once per write transaction with no intermediate transient states.
- **Dynamic Branch Pruning**: In conditional expressions $C \ ? \ A : B$, inactive branches are dynamically unlinked during re-evaluation, preventing memory leaks and stale execution.
- **Cycle Detection**: If a computed node is accessed during its own execution ($\text{RUNNING} \in \Phi(v)$), a `Circular dependency detected` error is thrown synchronously.
- **Zero Allocation on Memoized Reads**: Reading a clean computed node requires $O(1)$ time and $0$ heap allocations.
