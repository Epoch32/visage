import type { Child } from "../dom/render";
import type { ReadonlySignal } from "../signals";
import { createContext, useContext } from "../signals/context";
import { createControllableSignal } from "./utils";

export interface SliderContextValue {
  value: ReadonlySignal<number>;
  setValue: (val: number) => void;
  min: number;
  max: number;
  step: number;
  disabled: () => boolean;
  percentage: () => number;
}

export const SliderContext = createContext<SliderContextValue | null>(null);

export function useSliderContext(): SliderContextValue | null {
  return useContext(SliderContext);
}

export interface SliderProps {
  value?: () => number | undefined;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean | (() => boolean);
  trackClass?: any;
  rangeClass?: any;
  thumbClass?: any;
  as?: string;
  class?: any;
  style?: any;
  children?: Child | (() => Child);
  [key: string]: any;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

function roundToStep(val: number, min: number, step: number): number {
  const steps = Math.round((val - min) / step);
  return min + steps * step;
}

export function SliderRoot(props: SliderProps): Child {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const step = props.step ?? 1;

  const [value, setValue] = createControllableSignal<number>({
    value: props.value,
    defaultValue: props.defaultValue ?? min,
    onChange: props.onValueChange
  });

  const isDisabled = () =>
    typeof props.disabled === "function"
      ? (props.disabled as () => boolean)()
      : Boolean(props.disabled);

  const percentage = () => {
    const v = clamp(value(), min, max);
    return ((v - min) / (max - min)) * 100;
  };

  const updateValueFromPointer = (clientX: number, rect: DOMRect) => {
    if (isDisabled()) return;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const rawVal = min + ratio * (max - min);
    const stepped = roundToStep(rawVal, min, step);
    setValue(clamp(Number(stepped.toFixed(4)), min, max));
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (isDisabled() || e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture?.(e.pointerId);

    const rect = target.getBoundingClientRect();
    updateValueFromPointer(e.clientX, rect);

    const onPointerMove = (moveEvt: PointerEvent) => {
      updateValueFromPointer(moveEvt.clientX, rect);
    };

    const onPointerUp = (upEvt: PointerEvent) => {
      target.releasePointerCapture?.(upEvt.pointerId);
      target.removeEventListener("pointermove", onPointerMove as EventListener);
      target.removeEventListener("pointerup", onPointerUp as EventListener);
    };

    target.addEventListener("pointermove", onPointerMove as EventListener);
    target.addEventListener("pointerup", onPointerUp as EventListener);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isDisabled()) return;
    let nextVal = value();
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      nextVal += step;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      nextVal -= step;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextVal = min;
    } else if (e.key === "End") {
      e.preventDefault();
      nextVal = max;
    } else {
      return;
    }
    setValue(clamp(roundToStep(nextVal, min, step), min, max));
  };

  const ctx: SliderContextValue = {
    value,
    setValue,
    min,
    max,
    step,
    disabled: isDisabled,
    percentage
  };

  const {
    value: _v,
    defaultValue: _dv,
    onValueChange: _ovc,
    min: _min,
    max: _max,
    step: _step,
    disabled: _dis,
    trackClass,
    rangeClass,
    thumbClass,
    as: Tag = "div",
    children,
    class: className,
    style,
    ...rest
  } = props;

  return SliderContext.Provider({
    value: ctx,
    children: () => (
      <Tag
        role="slider"
        tabIndex={() => (isDisabled() ? -1 : 0)}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-disabled={isDisabled}
        data-disabled={() => (isDisabled() ? "true" : undefined)}
        class={className}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          userSelect: "none",
          touchAction: "none",
          cursor: () => (isDisabled() ? "not-allowed" : "pointer"),
          ...style
        }}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {children !== undefined ? (
          typeof children === "function" ? (
            children()
          ) : (
            children
          )
        ) : (
          <>
            <SliderTrack class={trackClass}>
              <SliderRange class={rangeClass} />
            </SliderTrack>
            <SliderThumb class={thumbClass} />
          </>
        )}
      </Tag>
    )
  });
}

export interface SliderTrackProps {
  as?: string;
  class?: any;
  style?: any;
  children?: Child | (() => Child);
  [key: string]: any;
}

export function SliderTrack(props: SliderTrackProps): Child {
  const { as: Tag = "div", children, class: className, style, ...rest } = props;

  return (
    <Tag
      class={className}
      style={() => ({
        position: "relative",
        flexGrow: 1,
        overflow: "hidden",
        borderRadius: "9999px",
        ...style
      })}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface SliderRangeProps {
  as?: string;
  class?: any;
  style?: any;
  [key: string]: any;
}

export function SliderRange(props: SliderRangeProps): Child {
  const ctx = useContext(SliderContext);
  const { as: Tag = "div", class: className, style, ...rest } = props;

  return (
    <Tag
      class={className}
      style={{
        position: "absolute",
        left: 0,
        height: "100%",
        width: () => `${ctx ? ctx.percentage() : 0}%`,
        ...style
      }}
      {...rest}
    />
  );
}

export interface SliderThumbProps {
  as?: string;
  class?: any;
  style?: any;
  [key: string]: any;
}

export function SliderThumb(props: SliderThumbProps): Child {
  const ctx = useContext(SliderContext);
  const { as: Tag = "span", class: className, style, ...rest } = props;

  return (
    <Tag
      aria-hidden="true"
      class={className}
      style={{
        position: "absolute",
        left: () => `${ctx ? ctx.percentage() : 0}%`,
        top: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        ...style
      }}
      {...rest}
    />
  );
}

export const Slider = Object.assign(SliderRoot, {
  Root: SliderRoot,
  Track: SliderTrack,
  Range: SliderRange,
  Thumb: SliderThumb
});
