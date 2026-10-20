import type { Child } from "@dom/render";
import { createControllableSignal } from "./utils";

export interface SwitchProps {
  checked?: () => boolean | undefined;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean | (() => boolean);
  required?: boolean;
  name?: string;
  value?: string;
  thumbClass?: any;
  thumbStyle?: any;
  as?: string;
  class?: any;
  style?: any;
  children?: Child | (() => Child);
  onClick?: (e: MouseEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  [key: string]: any;
}

export function SwitchRoot(props: SwitchProps): Child {
  const [checked, setChecked] = createControllableSignal<boolean>({
    value: props.checked,
    defaultValue: props.defaultChecked ?? false,
    onChange: props.onCheckedChange
  });

  const toggle = () => {
    const isDisabled =
      typeof props.disabled === "function"
        ? (props.disabled as () => boolean)()
        : Boolean(props.disabled);
    if (isDisabled) return;
    setChecked(!checked());
  };

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented) {
      toggle();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  const {
    checked: _c,
    defaultChecked: _dc,
    onCheckedChange: _occ,
    disabled,
    required,
    name,
    value,
    thumbClass,
    thumbStyle,
    as: Tag = "button",
    children,
    onClick,
    onKeyDown,
    class: className,
    style,
    ...rest
  } = props;

  return (
    <>
      <Tag
        type={Tag === "button" ? "button" : undefined}
        role="switch"
        aria-checked={checked}
        data-state={() => (checked() ? "checked" : "unchecked")}
        disabled={disabled}
        class={className}
        style={style}
        onClick={handleClick}
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
          <SwitchThumb class={thumbClass} style={thumbStyle} />
        )}
      </Tag>
      {name ? (
        <input
          type="checkbox"
          name={name}
          value={value ?? "on"}
          checked={checked}
          required={required}
          disabled={disabled}
          style={{
            position: "absolute",
            border: 0,
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap"
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

export interface SwitchThumbProps {
  as?: string;
  class?: any;
  style?: any;
  [key: string]: any;
}

export function SwitchThumb(props: SwitchThumbProps): Child {
  const { as: Tag = "span", class: className, style, ...rest } = props;
  return <Tag class={className} style={style} {...rest} />;
}

export const Switch = Object.assign(SwitchRoot, {
  Root: SwitchRoot,
  Thumb: SwitchThumb
});
