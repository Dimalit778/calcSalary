import { useId } from 'react';
import './Field.css';

function clampHoursInput(value: string) {
  // Preserve invalid input so validation can report it instead of turning -2 into +2.
  if (/[^\d.,]/.test(value)) return value;
  const cleaned = value.replace(/[^\d.,]/g, '');
  const sepIndex = cleaned.search(/[.,]/);
  if (sepIndex === -1) return cleaned.slice(0, 3);
  const whole = cleaned.slice(0, sepIndex).slice(0, 3);
  const fraction = cleaned.slice(sepIndex + 1).replace(/[.,]/g, '').slice(0, 2);
  return `${whole}${cleaned[sepIndex]}${fraction}`;
}

export interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  unit?: string;
  placeholder?: string;
  large?: boolean;
  hideLabel?: boolean;
  variant?: 'credits' | 'hours';
}

export default function Field({
  label,
  value,
  onChange,
  error,
  hint,
  unit,
  placeholder = '0',
  large = false,
  hideLabel = false,
  variant,
}: FieldProps) {
  const id = useId();
  return (
    <div className={['field', large ? 'large-field' : '', variant ? `field-${variant}` : ''].filter(Boolean).join(' ')}>
      <label className={hideLabel ? 'sr-only' : undefined} htmlFor={id}>
        {label}
      </label>
      <div className={`input-wrap ${error ? 'invalid' : ''}`}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          value={value}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={hint ? `${id}-help` : undefined}
          onChange={(e) => onChange(variant === 'hours' ? clampHoursInput(e.target.value) : e.target.value)}
        />
        {unit && (
          <span className="unit" aria-hidden="true">
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <p id={`${id}-help`} className="field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}
