import { Style } from "visage/style";

export interface RangeSliderProps {
  label?: string;
  min?: number;
  max?: number;
  minLabel?: string;
  midLabel?: string;
  maxLabel?: string;
  id?: string;
  name?: string;
  value?: any;
  onInput?: (e: any) => void;
  onBlur?: (e: any) => void;
}

export function RangeSlider(props: RangeSliderProps) {
  const rangeId = props.id ?? props.name;

  return (
    <div class="form-group">
      {props.label && <label htmlFor={rangeId}>{props.label}</label>}
      <div class="range-wrapper">
        <input
          id={rangeId}
          name={props.name}
          type="range"
          min={props.min ?? 0}
          max={props.max ?? 10}
          value={props.value}
          onInput={props.onInput}
          onBlur={props.onBlur}
        />
        <div class="range-legend">
          <span>{props.minLabel ?? "0"}</span>
          {props.midLabel && <span>{props.midLabel}</span>}
          <span>{props.maxLabel ?? "10"}</span>
        </div>
      </div>
      <div>
        <span class="range-score-badge">
          Selected Score:{" "}
          <strong>
            {typeof props.value === "function"
              ? props.value()
              : (props.value?.get?.() ?? props.value)}
          </strong>{" "}
          / {props.max ?? 10}
        </span>
      </div>
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
        .range-wrapper {
          margin-top: 6px;
        }
        input[type="range"] {
          width: 100%;
          accent-color: var(--primary);
          height: 6px;
          background: var(--card-subtle);
          border-radius: 4px;
          cursor: pointer;
        }
        .range-legend {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 6px;
        }
        .range-score-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 10px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          background: var(--card-subtle);
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--card-border);
          font-family: var(--mono);
        }
        .range-score-badge strong {
          color: var(--text);
        }
      `}</Style>
    </div>
  );
}
