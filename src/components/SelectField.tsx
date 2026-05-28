
interface SelectFieldProps {
  value: string;
  onChange: (val: string) => void;
  options: string[] | { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className = '',
}: SelectFieldProps) {
  const normalized = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-base text-teal-900 appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 ${className}`}
      style={{ WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%238e8e93' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {normalized.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
