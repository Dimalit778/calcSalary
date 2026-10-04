import { RotateCcw } from 'lucide-react';
import type { Draft } from '../../helpers/form';
import Field from '../Field/Field';
import HoursSection from '../HoursSection/HoursSection';
import RolePicker from '../RolePicker/RolePicker';
import './SalaryForm.css';

interface SalaryFormProps {
  draft: Draft;
  errors: Partial<Record<keyof Draft, string>>;
  storageMessage: string;
  announcement: string;
  onUpdate: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  onReset: () => void;
  onCalculate: () => void;
  canCalculate: boolean;
  showCalculate: boolean;
}

export default function SalaryForm({
  draft,
  errors,
  storageMessage,
  announcement,
  onUpdate,
  onReset,
  onCalculate,
  canCalculate,
  showCalculate,
}: SalaryFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (showCalculate && canCalculate) onCalculate();
      }}
      aria-label="נתוני חישוב השכר"
    >
      <div className="basics single-role">
        <div className="role-heading">
          <div className="role-and-credits">
            <RolePicker value={draft.hourlyWage} onChange={(value) => onUpdate('hourlyWage', value)} />
          </div>
          <button className="reset-top" type="button" onClick={onReset}>
            <RotateCcw size={16} />
            איפוס
          </button>
        </div>
      </div>
      <HoursSection draft={draft} errors={errors} onUpdate={onUpdate} />
      <div className="credits-simple">
        <Field
          label="נק' זיכוי מס"
          value={draft.creditPoints}
          onChange={(value) => onUpdate('creditPoints', value)}
          error={errors.creditPoints}
          placeholder="0.0"
          variant="credits"
        />
      </div>
      {showCalculate && (
        <button className="calculate-button" type="submit" disabled={!canCalculate}>
          חשב
        </button>
      )}
      {storageMessage && <p role="status">{storageMessage}</p>}
      {announcement && <p role="status">{announcement}</p>}
    </form>
  );
}
