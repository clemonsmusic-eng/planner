
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-ios-gray-100 text-ios-gray-600',
};

export function StatusBadge({ label, variant = 'neutral', size = 'sm' }: StatusBadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeClass} ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}

export function getScheduleStatusVariant(
  status: 'ON TRACK' | 'OVER BUDGET' | 'UNDER SCHEDULED'
): BadgeVariant {
  if (status === 'ON TRACK') return 'success';
  if (status === 'OVER BUDGET') return 'error';
  return 'warning';
}
