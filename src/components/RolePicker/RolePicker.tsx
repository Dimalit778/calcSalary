import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { WAGE_OPTIONS } from '../../helpers/form';
import './RolePicker.css';

interface RolePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function RolePicker({ value, onChange }: RolePickerProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <div
      className="role-picker"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpen(false);
          root.current?.querySelector('button')?.focus();
        }
      }}
    >
      <button
        type="button"
        className="role-trigger"
        aria-label="תפקיד"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span className="role-trigger-label">
          {WAGE_OPTIONS.find((option) => option.value === value)?.label ?? 'בחר תפקיד'}
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="role-menu" id={id} role="group" aria-label="בחירת תפקיד">
          {WAGE_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={option.value === value ? 'selected' : ''}
              aria-pressed={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                root.current?.querySelector('button')?.focus();
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
