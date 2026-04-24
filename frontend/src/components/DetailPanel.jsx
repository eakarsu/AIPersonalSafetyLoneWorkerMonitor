import { X, Pencil, Trash2 } from 'lucide-react';

export default function DetailPanel({
  isOpen,
  onClose,
  title,
  data,
  fields = [],
  onEdit,
  onDelete,
}) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">
            {title || 'Details'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {data ? (
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.key} className="group">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {field.label}
                  </label>
                  <div className="mt-1 text-sm text-gray-800 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 group-hover:border-gray-200 transition-colors">
                    {field.render
                      ? field.render(data[field.key], data)
                      : data[field.key] ?? (
                          <span className="text-gray-400 italic">Not available</span>
                        )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              No data available
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(onEdit || onDelete) && data && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
            {onEdit && (
              <button
                onClick={() => onEdit(data)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Pencil size={15} />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(data)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-danger-500 text-danger-500 text-sm font-medium rounded-lg hover:bg-danger-50 transition-colors"
              >
                <Trash2 size={15} />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
