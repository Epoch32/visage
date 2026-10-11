import { For } from "../dom/control-flow";
import type { Child } from "../dom/render";
import { createSignal } from "../signals";
import { createControllableSignal } from "./utils";

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface ColumnDef<T = any> {
  id: string;
  header: Child | (() => Child);
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => Child;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T = any> {
  data: T[] | (() => T[]);
  columns: ColumnDef<T>[];
  sort?: () => SortState | undefined;
  onSortChange?: (sort: SortState) => void;
  filter?: () => string | undefined;
  selection?: "none" | "single" | "multi";
  selectedKeys?: () => string[] | undefined;
  onSelectionChange?: (keys: string[]) => void;
  getRowId?: (row: T, index: number) => string;
  pageSize?: number;
  onRowClick?: (row: T, index: number) => void;
  emptyText?: string;
  class?: any;
  style?: any;
  tableClass?: any;
  headerClass?: any;
  rowClass?: any;
  cellClass?: any;
  paginationClass?: any;
  [key: string]: any;
}

export function DataTable<T extends Record<string, any>>(props: DataTableProps<T>): Child {
  const [sortState, setSortState] = createControllableSignal<SortState>({
    value: props.sort,
    defaultValue: { column: "", direction: null },
    onChange: props.onSortChange
  });

  const [selectedKeys, setSelectedKeys] = createControllableSignal<string[]>({
    value: props.selectedKeys,
    defaultValue: [],
    onChange: props.onSelectionChange
  });

  const [currentPage, setCurrentPage] = createSignal(0, { internal: true });
  const pageSize = props.pageSize ?? 10;
  const selectionMode = props.selection ?? "none";

  const getRowId = (row: T, index: number): string => {
    if (props.getRowId) return props.getRowId(row, index);
    if (row && typeof row === "object" && "id" in row) return String(row.id);
    return String(index);
  };

  // 1. Filtered Data
  const filteredData = () => {
    const raw = typeof props.data === "function" ? props.data() : props.data;
    if (!raw) return [];
    const filterQuery = props.filter
      ? (typeof props.filter === "function" ? props.filter() : props.filter)?.toLowerCase().trim()
      : "";
    if (!filterQuery) return raw;

    return raw.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(filterQuery))
    );
  };

  // 2. Sorted Data
  const sortedData = () => {
    const list = [...filteredData()];
    const currentSort = sortState();
    if (!currentSort.column || !currentSort.direction) return list;

    return list.sort((a, b) => {
      const aVal = a[currentSort.column];
      const bVal = b[currentSort.column];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comp = aVal < bVal ? -1 : 1;
      return currentSort.direction === "asc" ? comp : -comp;
    });
  };

  // 3. Paginated Data
  const totalPages = () => Math.ceil(sortedData().length / pageSize) || 1;
  const paginatedData = () => {
    if (!props.pageSize) return sortedData();
    const start = currentPage() * pageSize;
    return sortedData().slice(start, start + pageSize);
  };

  const handleSort = (colId: string) => {
    const current = sortState();
    if (current.column !== colId) {
      setSortState({ column: colId, direction: "asc" });
    } else if (current.direction === "asc") {
      setSortState({ column: colId, direction: "desc" });
    } else {
      setSortState({ column: "", direction: null });
    }
  };

  const handleSelectRow = (key: string, e: MouseEvent) => {
    e.stopPropagation();
    if (selectionMode === "single") {
      setSelectedKeys(selectedKeys().includes(key) ? [] : [key]);
    } else if (selectionMode === "multi") {
      const current = selectedKeys();
      if (current.includes(key)) {
        setSelectedKeys(current.filter((k) => k !== key));
      } else {
        setSelectedKeys([...current, key]);
      }
    }
  };

  const handleSelectAll = () => {
    if (selectionMode !== "multi") return;
    const allCurrentKeys = paginatedData().map((row, i) => getRowId(row, i));
    const allSelected = allCurrentKeys.every((k) => selectedKeys().includes(k));

    if (allSelected) {
      setSelectedKeys(selectedKeys().filter((k) => !allCurrentKeys.includes(k)));
    } else {
      setSelectedKeys(Array.from(new Set([...selectedKeys(), ...allCurrentKeys])));
    }
  };

  const {
    class: className,
    style,
    tableClass,
    headerClass,
    rowClass,
    cellClass,
    paginationClass,
    emptyText = "No data available",
    ...rest
  } = props;

  return (
    <div
      class={className}
      style={{ display: "flex", flexDirection: "column", width: "100%", ...style }}
      {...rest}
    >
      <div style={{ overflowX: "auto", width: "100%" }}>
        <table class={tableClass} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead class={headerClass}>
            <tr>
              {selectionMode === "multi" ? (
                <th style={{ width: "40px", padding: "8px" }}>
                  <input
                    type="checkbox"
                    checked={() => {
                      const keys = paginatedData().map((row, i) => getRowId(row, i));
                      return keys.length > 0 && keys.every((k) => selectedKeys().includes(k));
                    }}
                    onChange={handleSelectAll}
                  />
                </th>
              ) : null}

              {props.columns.map((col) => {
                const isSorted = () => sortState().column === col.id;
                const sortDir = () => (isSorted() ? sortState().direction : null);

                return (
                  <th
                    style={{
                      width: col.width,
                      textAlign: col.align ?? "left",
                      cursor: col.sortable ? "pointer" : "default",
                      userSelect: col.sortable ? "none" : "auto",
                      padding: "10px 12px"
                    }}
                    onClick={() => {
                      if (col.sortable) handleSort(col.id);
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <span>{typeof col.header === "function" ? col.header() : col.header}</span>
                      {col.sortable ? (
                        <span
                          style={{ fontSize: "10px", color: isSorted() ? "#38bdf8" : "#64748b" }}
                        >
                          {() => (sortDir() === "asc" ? "▲" : sortDir() === "desc" ? "▼" : "⇅")}
                        </span>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <For
              each={paginatedData}
              fallback={
                <tr>
                  <td
                    colSpan={props.columns.length + (selectionMode === "multi" ? 1 : 0)}
                    style={{ textAlign: "center", padding: "24px", color: "#64748b" }}
                  >
                    {emptyText}
                  </td>
                </tr>
              }
            >
              {(row: T, idx: () => number) => {
                const key = () => getRowId(row, idx());
                const isSelected = () => selectedKeys().includes(key());

                return (
                  <tr
                    class={rowClass}
                    style={{ cursor: props.onRowClick ? "pointer" : "default" }}
                    data-selected={isSelected}
                    onClick={() => {
                      if (props.onRowClick) props.onRowClick(row, idx());
                    }}
                  >
                    {selectionMode === "multi" ? (
                      <td style={{ width: "40px", padding: "8px" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onClick={(e: MouseEvent) => handleSelectRow(key(), e)}
                        />
                      </td>
                    ) : null}

                    {props.columns.map((col) => {
                      const content = col.cell
                        ? col.cell(row, idx())
                        : col.accessorKey
                          ? row[col.accessorKey]
                          : row[col.id];

                      return (
                        <td
                          class={cellClass}
                          style={{
                            textAlign: col.align ?? "left",
                            padding: "10px 12px"
                          }}
                        >
                          {typeof content === "function" ? content() : content}
                        </td>
                      );
                    })}
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {props.pageSize ? (
        <div
          class={paginationClass}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderTop: "1px solid #1e293b",
            fontSize: "12px",
            color: "#94a3b8"
          }}
        >
          <div>
            Showing <strong>{() => currentPage() * pageSize + 1}</strong> to{" "}
            <strong>{() => Math.min((currentPage() + 1) * pageSize, sortedData().length)}</strong>{" "}
            of <strong>{() => sortedData().length}</strong> entries
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button
              type="button"
              disabled={() => currentPage() === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              style={{ padding: "4px 8px", cursor: "pointer" }}
            >
              Previous
            </button>
            <span>
              Page <strong>{() => currentPage() + 1}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={() => currentPage() >= totalPages() - 1}
              onClick={() => setCurrentPage((p) => Math.min(totalPages() - 1, p + 1))}
              style={{ padding: "4px 8px", cursor: "pointer" }}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
