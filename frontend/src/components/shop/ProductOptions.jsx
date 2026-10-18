import { Plus, Minus } from '../ui/Icons';

/** Colour choice, shared by the product page and quick view. */
export function ColourPicker({ colors = [], value, onChange }) {
  if (!colors.length) return null;
  return (
    <div className="field">
      <span className="field-label">
        Colour <b>{value}</b>
      </span>
      <div className="opt-row" role="radiogroup" aria-label="Colour">
        {colors.map(([label, hex]) => (
          <button
            type="button"
            key={label}
            className={`opt${value === label ? ' on' : ''}`}
            onClick={() => onChange(label)}
            role="radio"
            aria-checked={value === label}
          >
            <i style={{ background: hex }} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Minus / number / plus. */
export function QtyStepper({ value, onChange, min = 1, max = 20, disabled = false, small = false }) {
  return (
    <div className={`qty${small ? ' qty-sm' : ''}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Reduce quantity"
      >
        <Minus size={small ? 14 : 16} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        title={value >= max ? `Only ${max} available` : undefined}
      >
        <Plus size={small ? 14 : 16} />
      </button>
    </div>
  );
}
