import { HOUR_CATEGORIES } from '../../helpers/calculator';
import type { Draft } from '../../helpers/form';
import Field from '../Field/Field';
import './HoursSection.css';

const supplementalColumns: { key: keyof Draft; title: string }[] = [
  { key: 'shift20Hours', title: 'ת.מ 20%' },
  { key: 'largeMeals', title: 'כלכלה גדולה' },
  { key: 'smallMeals', title: 'כלכלה קטנה' },
  { key: 'saturdayTrips', title: 'נסיעות ו/ש' },
];

function HoursLabel({ text }: { text: string }) {
  return <span className="hours-group-label">{text}</span>;
}

interface HoursCell {
  key: keyof Draft;
  title: string;
  accessibleLabel: string;
}

const primaryCells: HoursCell[] = HOUR_CATEGORIES.slice(0, 7).map((category) => ({
  key: `hours${category.key}`,
  title: category.title,
  accessibleLabel: category.accessibleLabel,
}));

const secondaryCells: HoursCell[] = [
  ...HOUR_CATEGORIES.slice(7).map((category) => ({
    key: `hours${category.key}` as keyof Draft,
    title: category.title,
    accessibleLabel: category.accessibleLabel,
  })),
  ...supplementalColumns.map((column) => ({
    key: column.key,
    title: column.key === 'saturdayTrips' ? 'נסיעות ו׳/ש׳' : column.title,
    accessibleLabel: column.title,
  })),
];

interface HoursSectionProps {
  draft: Draft;
  errors: Partial<Record<keyof Draft, string>>;
  onUpdate: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}

export default function HoursSection({ draft, errors, onUpdate }: HoursSectionProps) {
  const cells = (items: HoursCell[]) =>
    items.map((item) => (
      <div className="hours-group-cell" key={item.key}>
        <HoursLabel text={item.title} />
        <Field
          label={item.accessibleLabel}
          value={String(draft[item.key] ?? '')}
          error={errors[item.key]}
          onChange={(value) => onUpdate(item.key, value)}
          hideLabel
          placeholder="0"
          variant="hours"
        />
      </div>
    ));

  return (
    <section className="hours-section">
      <div className="hours-groups" role="region" aria-label="רשימת שדות של שעות">
        <div className="hours-row hours-row-primary">{cells(primaryCells)}</div>
        <div className="hours-row hours-row-secondary">{cells(secondaryCells)}</div>
      </div>
    </section>
  );
}
