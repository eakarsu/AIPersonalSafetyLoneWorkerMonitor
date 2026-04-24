import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Inbox } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  onRowClick,
  onEdit,
  onDelete,
  title,
  onAdd,
  addLabel = 'Add New',
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return columns.some((col) => {
      const value = item[col.key];
      return value != null && String(value).toLowerCase().includes(query);
    });
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          <p className="text-xs text-gray-400 mt-0.5">{filteredData.length} record{filteredData.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-48 transition-all"
            />
          </div>
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
            >
              <Plus size={16} />
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="px-6 py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Inbox size={24} className="text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">No records found</p>
                    <p className="text-xs text-gray-400">
                      {searchQuery ? 'Try adjusting your search query' : 'Get started by adding a new record'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item, rowIndex) => (
                <tr
                  key={item.id || rowIndex}
                  onClick={() => onRowClick?.(item)}
                  className={`${
                    rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  } hover:bg-primary-50/50 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-3.5 text-sm text-gray-700">
                      {col.render ? col.render(item[col.key], item) : item[col.key] ?? '-'}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(item);
                            }}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(item);
                            }}
                            className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
