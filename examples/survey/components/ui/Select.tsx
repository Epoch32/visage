import { For } from "visage/dom";
import { Style } from "visage/style";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  hint?: string;
  error?: string | null | (() => string | null | undefined);
  id?: string;
  name?: string;
  options: (string | SelectOption)[];
  value?: any;
  onInput?: (e: any) => void;
  onBlur?: (e: any) => void;
}

export function Select(props: SelectProps) {
  const selectId = props.id ?? props.name;

  return (
    <div class="form-group">
      {props.label && <label htmlFor={selectId}>{props.label}</label>}
      <select
        id={selectId}
        name={props.name}
        value={props.value}
        onInput={props.onInput}
        onBlur={props.onBlur}
      >
        <For each={props.options}>
          {(opt) => {
            const val = typeof opt === "string" ? opt : opt.value;
            const lbl = typeof opt === "string" ? opt : opt.label;
            return <option value={val}>{lbl}</option>;
          }}
        </For>
      </select>
      {props.hint && <span class="field-hint">{props.hint}</span>}
      {() => {
        const err = typeof props.error === "function" ? props.error() : props.error;
        return err ? <span class="field-error">{err}</span> : null;
      }}
      <Style>{`
        .form-group {
          margin-bottom: 22px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .field-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .field-error {
          color: var(--error);
          font-size: 0.8rem;
          font-weight: 500;
        }
        select {
          width: 100%;
          padding: 10px 14px;
          background: var(--card-subtle);
          border: 1px solid var(--card-border);
          border-radius: 8px;
          color: var(--text);
          font-family: inherit;
          font-size: 0.92rem;
          outline: none;
          transition: all 0.15s ease;
        }
        select:hover {
          border-color: var(--card-border-hover);
        }
        select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-soft);
          background: #181c26;
        }
      `}</Style>
    </div>
  );
}
