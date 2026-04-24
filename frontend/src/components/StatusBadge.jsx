const statusStyles = {
  // Green statuses
  active: 'bg-green-100 text-green-700 border-green-200',
  safe: 'bg-green-100 text-green-700 border-green-200',
  compliant: 'bg-green-100 text-green-700 border-green-200',
  passed: 'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-green-100 text-green-700 border-green-200',

  // Yellow statuses
  inactive: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  scheduled: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  not_started: 'bg-yellow-100 text-yellow-700 border-yellow-200',

  // Red statuses
  emergency: 'bg-red-100 text-red-700 border-red-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-red-100 text-red-700 border-red-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  non_compliant: 'bg-red-100 text-red-700 border-red-200',
  expired: 'bg-red-100 text-red-700 border-red-200',

  // Gray statuses
  offline: 'bg-gray-100 text-gray-600 border-gray-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
  resolved: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',

  // Extra
  medium: 'bg-orange-100 text-orange-700 border-orange-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
};

const defaultStyle = 'bg-gray-100 text-gray-600 border-gray-200';

export default function StatusBadge({ status, type }) {
  if (!status) return null;

  const key = status.toLowerCase().replace(/[\s-]/g, '_');
  const style = statusStyles[key] || defaultStyle;
  const displayText = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}
    >
      {displayText}
    </span>
  );
}
