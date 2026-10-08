/** @jsxImportSource visage */
import { For } from "../dom/control-flow";
import { computed, signal } from "../signals";
import { createVirtualizer } from "./virtualizer";

export interface VirtualListProps<T> {
  each: T[] | (() => T[]);
  itemHeight: number | ((index: number) => number);
  height?: number | string;
  width?: number | string;
  overscan?: number;
  class?: string;
  style?: Record<string, any> | (() => Record<string, any>);
  children: (item: T, index: () => number) => any;
}

export function VirtualList<T>(props: VirtualListProps<T>) {
  const scrollElement = signal<HTMLElement | null>(null);

  const getItems = (): T[] =>
    typeof props.each === "function" ? (props.each as () => T[])() : props.each;
  const count = computed(() => getItems().length);

  const parsedHeight =
    typeof props.height === "number"
      ? props.height
      : Number.parseInt(String(props.height || 400), 10) || 400;

  const virtualizer = createVirtualizer({
    count,
    itemHeight: props.itemHeight,
    overscan: props.overscan ?? 3,
    initialSize: parsedHeight,
    getScrollElement: () => scrollElement()
  });

  const containerHeight =
    typeof props.height === "number" ? `${props.height}px` : (props.height ?? "400px");

  const containerWidth =
    typeof props.width === "number" ? `${props.width}px` : (props.width ?? "100%");

  return (
    <div
      ref={(el: HTMLElement) => {
        scrollElement.set(el);
      }}
      class={props.class}
      style={() => {
        const customStyle = typeof props.style === "function" ? props.style() : props.style || {};
        return {
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
          height: containerHeight,
          width: containerWidth,
          WebkitOverflowScrolling: "touch",
          ...customStyle
        };
      }}
    >
      <div
        style={() => ({
          height: `${virtualizer.totalSize()}px`,
          width: "100%",
          position: "relative",
          pointerEvents: "none"
        })}
      >
        <For each={() => virtualizer.virtualItems()}>
          {(vItem) => {
            const itemData = computed(() => getItems()[vItem.index]);
            return (
              <div
                style={() => ({
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${vItem.size}px`,
                  transform: `translateY(${vItem.start}px)`,
                  pointerEvents: "auto",
                  willChange: "transform"
                })}
              >
                {props.children(itemData() as T, () => vItem.index)}
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}

export interface VirtualGridProps<T> {
  data: T[][] | (() => T[][]);
  rowHeight: number;
  columnWidth: number;
  height?: number | string;
  width?: number | string;
  overscan?: number;
  children: (item: T, rowIndex: number, colIndex: number) => any;
}

export function VirtualGrid<T>(props: VirtualGridProps<T>) {
  const scrollElement = signal<HTMLElement | null>(null);
  const getData = (): T[][] =>
    typeof props.data === "function" ? (props.data as () => T[][])() : props.data;

  const rowCount = computed(() => getData().length);
  const colCount = computed(() => {
    const d = getData();
    return d[0] ? d[0].length : 0;
  });

  const rowVirtualizer = createVirtualizer({
    count: rowCount,
    itemHeight: props.rowHeight,
    overscan: props.overscan ?? 3,
    getScrollElement: () => scrollElement()
  });

  const colVirtualizer = createVirtualizer({
    count: colCount,
    itemHeight: props.columnWidth,
    overscan: props.overscan ?? 3,
    horizontal: true,
    getScrollElement: () => scrollElement()
  });

  const containerHeight =
    typeof props.height === "number" ? `${props.height}px` : (props.height ?? "400px");

  const containerWidth =
    typeof props.width === "number" ? `${props.width}px` : (props.width ?? "100%");

  return (
    <div
      ref={(el: HTMLElement) => {
        scrollElement.set(el);
      }}
      style={{
        overflow: "auto",
        position: "relative",
        height: containerHeight,
        width: containerWidth,
        WebkitOverflowScrolling: "touch"
      }}
    >
      <div
        style={() => ({
          height: `${rowVirtualizer.totalSize()}px`,
          width: `${colVirtualizer.totalSize()}px`,
          position: "relative"
        })}
      >
        <For each={() => rowVirtualizer.virtualItems()}>
          {(r) => (
            <For each={() => colVirtualizer.virtualItems()}>
              {(c) => {
                const rowData = getData()[r.index];
                const item = rowData ? rowData[c.index] : undefined;
                return (
                  <div
                    style={() => ({
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: `${c.size}px`,
                      height: `${r.size}px`,
                      transform: `translate(${c.start}px, ${r.start}px)`,
                      willChange: "transform"
                    })}
                  >
                    {props.children(item as T, r.index, c.index)}
                  </div>
                );
              }}
            </For>
          )}
        </For>
      </div>
    </div>
  );
}
