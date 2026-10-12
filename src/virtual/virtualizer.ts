import { computed, effect, onCleanup, type ReadonlySignal, signal } from "../signals";

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
  key: number | string;
}

export interface VirtualizerOptions {
  count: number | (() => number);
  itemHeight: number | ((index: number) => number);
  getScrollElement: () => HTMLElement | null;
  overscan?: number;
  horizontal?: boolean;
  initialSize?: number;
  estimateSize?: (index: number) => number;
}

export interface Virtualizer {
  virtualItems: ReadonlySignal<VirtualItem[]>;
  totalSize: ReadonlySignal<number>;
  scrollOffset: ReadonlySignal<number>;
  containerSize: ReadonlySignal<number>;
  startIndex: ReadonlySignal<number>;
  endIndex: ReadonlySignal<number>;
  scrollToIndex: (index: number, options?: { align?: "start" | "center" | "end" | "auto" }) => void;
  scrollToOffset: (offset: number) => void;
  measureElement: (element: HTMLElement | null, index: number) => void;
}

export function createVirtualizer(options: VirtualizerOptions): Virtualizer {
  const overscan = options.overscan ?? 3;
  const isHorizontal = Boolean(options.horizontal);

  const getCount = (): number =>
    typeof options.count === "function"
      ? (options.count as () => number)()
      : (options.count as number);

  const getItemHeight =
    typeof options.itemHeight === "function"
      ? options.itemHeight
      : () => options.itemHeight as number;

  const scrollOffset = signal(0);
  const containerSize = signal(options.initialSize ?? 400);

  // Dynamic measurement cache for variable height rows
  const dynamicSizeCache = new Map<number, number>();

  const getItemSize = (index: number): number => {
    const cached = dynamicSizeCache.get(index);
    if (cached !== undefined) return cached;
    return getItemHeight(index);
  };

  // Cached prefix offsets for O(1) offset lookups and true O(log N) binary search
  const offsetsCache: number[] = [0];
  let offsetsValidUpTo = 0;

  const invalidateOffsetsFrom = (index: number) => {
    offsetsValidUpTo = Math.min(offsetsValidUpTo, index);
  };

  const getOffsetForIndex = (targetIndex: number): number => {
    if (targetIndex <= 0) return 0;
    if (typeof options.itemHeight === "number" && dynamicSizeCache.size === 0) {
      return targetIndex * options.itemHeight;
    }
    if (targetIndex <= offsetsValidUpTo) {
      return offsetsCache[targetIndex]!;
    }
    for (let i = offsetsValidUpTo; i < targetIndex; i++) {
      offsetsCache[i + 1] = (offsetsCache[i] ?? 0) + getItemSize(i);
    }
    offsetsValidUpTo = targetIndex;
    return offsetsCache[targetIndex]!;
  };

  const measurementVersion = signal(0, { internal: true });

  // Compute prefix offsets for fast range calculation
  const totalSize = computed(() => {
    measurementVersion();
    const count = getCount();
    if (typeof options.itemHeight === "number" && dynamicSizeCache.size === 0) {
      return count * options.itemHeight;
    }
    return getOffsetForIndex(count);
  });

  const findIndexAtOffset = (offset: number): number => {
    const count = getCount();
    if (count === 0) return 0;

    if (typeof options.itemHeight === "number" && dynamicSizeCache.size === 0) {
      const idx = Math.floor(offset / options.itemHeight);
      return Math.max(0, Math.min(count - 1, idx));
    }

    let low = 0;
    let high = count - 1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const midStart = getOffsetForIndex(mid);
      const midEnd = midStart + getItemSize(mid);

      if (offset < midStart) {
        high = mid - 1;
      } else if (offset >= midEnd) {
        low = mid + 1;
      } else {
        return mid;
      }
    }

    return Math.max(0, Math.min(count - 1, low));
  };

  const startIndex = computed(() => {
    measurementVersion();
    const offset = scrollOffset();
    const rawStart = findIndexAtOffset(offset);
    return Math.max(0, rawStart - overscan);
  });

  const endIndex = computed(() => {
    measurementVersion();
    const count = getCount();
    if (count === 0) return 0;
    const endOffset = scrollOffset() + (containerSize() || 500);
    const rawEnd = findIndexAtOffset(endOffset);
    return Math.min(count - 1, rawEnd + overscan);
  });

  const itemCache = new Map<number, VirtualItem>();

  const virtualItems = computed(() => {
    const count = getCount();
    if (count === 0) return [];

    const start = startIndex();
    const end = endIndex();
    const items: VirtualItem[] = [];

    let currentStart = getOffsetForIndex(start);

    for (let i = start; i <= end; i++) {
      const size = getItemSize(i);
      let item = itemCache.get(i);
      if (!item || item.start !== currentStart || item.size !== size) {
        item = {
          index: i,
          start: currentStart,
          size,
          end: currentStart + size,
          key: i
        };
        itemCache.set(i, item);
      }
      items.push(item);
      currentStart += size;
    }

    return items;
  });

  // Setup DOM event listeners and ResizeObserver
  effect(() => {
    const el = options.getScrollElement();
    if (!el || typeof el.addEventListener !== "function") return;

    const handleScroll = () => {
      const offset = isHorizontal ? el.scrollLeft : el.scrollTop;
      scrollOffset.set(offset);
    };

    const handleResize = () => {
      const size = isHorizontal ? el.clientWidth : el.clientHeight;
      if (size > 0) {
        containerSize.set(size);
      }
    };

    // Initial sync
    handleResize();
    handleScroll();

    el.addEventListener("scroll", handleScroll, { passive: true });

    let resizeObserver: any;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(el);
    }

    onCleanup(() => {
      el.removeEventListener("scroll", handleScroll);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    });
  });

  const scrollToIndex = (
    index: number,
    scrollOpts?: { align?: "start" | "center" | "end" | "auto" }
  ) => {
    const el = options.getScrollElement();
    if (!el) return;

    const align = scrollOpts?.align ?? "auto";
    const itemStart = getOffsetForIndex(index);
    const itemSize = getItemSize(index);
    const itemEnd = itemStart + itemSize;
    const currentScroll = scrollOffset();
    const cSize = containerSize();

    let targetOffset = itemStart;

    if (align === "start") {
      targetOffset = itemStart;
    } else if (align === "end") {
      targetOffset = itemEnd - cSize;
    } else if (align === "center") {
      targetOffset = itemStart - (cSize - itemSize) / 2;
    } else {
      // auto
      if (itemStart < currentScroll) {
        targetOffset = itemStart;
      } else if (itemEnd > currentScroll + cSize) {
        targetOffset = itemEnd - cSize;
      } else {
        return; // already fully in view
      }
    }

    targetOffset = Math.max(0, targetOffset);
    if (isHorizontal) {
      el.scrollLeft = targetOffset;
    } else {
      el.scrollTop = targetOffset;
    }
    scrollOffset.set(targetOffset);
  };

  const scrollToOffset = (offset: number) => {
    const el = options.getScrollElement();
    if (el) {
      if (isHorizontal) {
        el.scrollLeft = offset;
      } else {
        el.scrollTop = offset;
      }
    }
    scrollOffset.set(offset);
  };

  const measureElement = (element: HTMLElement | null, index: number) => {
    if (!element) return;
    const measuredSize = isHorizontal
      ? element.getBoundingClientRect().width
      : element.getBoundingClientRect().height;
    if (measuredSize > 0 && dynamicSizeCache.get(index) !== measuredSize) {
      dynamicSizeCache.set(index, measuredSize);
      invalidateOffsetsFrom(index);
      measurementVersion.update((v) => v + 1);
    }
  };

  return {
    virtualItems,
    totalSize,
    scrollOffset,
    containerSize,
    startIndex,
    endIndex,
    scrollToIndex,
    scrollToOffset,
    measureElement
  };
}
