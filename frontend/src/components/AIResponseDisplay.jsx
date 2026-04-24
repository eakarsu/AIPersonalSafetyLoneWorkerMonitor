import { Sparkles, Brain } from 'lucide-react';

const riskColors = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

function highlightRiskBadges(text) {
  const riskPattern = /\b(critical|high|medium|low)\b/gi;
  const parts = text.split(riskPattern);
  return parts.map((part, i) => {
    const key = part.toLowerCase();
    if (riskColors[key]) {
      return (
        <span
          key={i}
          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${riskColors[key]}`}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{formatInlineText(part)}</span>;
  });
}

function formatInlineText(text) {
  // Handle bold (**text**)
  const boldPattern = /\*\*(.*?)\*\*/g;
  const parts = text.split(boldPattern);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-gray-900">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function parseResponse(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks = [];
  let currentList = null;

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    // H1 header
    if (/^# /.test(trimmed)) {
      flushList();
      blocks.push({ type: 'h1', text: trimmed.replace(/^# /, '') });
      return;
    }

    // H2 header
    if (/^## /.test(trimmed)) {
      flushList();
      blocks.push({ type: 'h2', text: trimmed.replace(/^## /, '') });
      return;
    }

    // H3 header
    if (/^### /.test(trimmed)) {
      flushList();
      blocks.push({ type: 'h3', text: trimmed.replace(/^### /, '') });
      return;
    }

    // Bullet points
    if (/^[-*] /.test(trimmed)) {
      const content = trimmed.replace(/^[-*] /, '');
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(content);
      return;
    }

    // Numbered list
    if (/^\d+[.)]\s/.test(trimmed)) {
      const content = trimmed.replace(/^\d+[.)]\s/, '');
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(content);
      return;
    }

    // Regular paragraph
    flushList();
    blocks.push({ type: 'p', text: trimmed });
  });

  flushList();
  return blocks;
}

function renderBlock(block, index) {
  switch (block.type) {
    case 'h1':
      return (
        <h3
          key={index}
          className="text-xl font-bold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200"
        >
          {highlightRiskBadges(block.text)}
        </h3>
      );
    case 'h2':
      return (
        <h4 key={index} className="text-lg font-semibold text-gray-800 mt-5 mb-2">
          {highlightRiskBadges(block.text)}
        </h4>
      );
    case 'h3':
      return (
        <h5 key={index} className="text-base font-semibold text-gray-700 mt-4 mb-1.5">
          {highlightRiskBadges(block.text)}
        </h5>
      );
    case 'ul':
      return (
        <ul key={index} className="space-y-1.5 my-2 ml-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
              <span>{highlightRiskBadges(item)}</span>
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol key={index} className="space-y-1.5 my-2 ml-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
              <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span>{highlightRiskBadges(item)}</span>
            </li>
          ))}
        </ol>
      );
    case 'p':
      return (
        <p key={index} className="text-sm text-gray-700 leading-relaxed my-2">
          {highlightRiskBadges(block.text)}
        </p>
      );
    default:
      return null;
  }
}

export default function AIResponseDisplay({ response, title, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-[length:200%_100%] animate-pulse" />
        <div className="p-8 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
              <Brain size={28} className="text-purple-500 animate-pulse" />
            </div>
            <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-purple-300 animate-pulse-ring" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">AI is analyzing...</p>
            <p className="text-xs text-gray-400 mt-1">Processing data and generating insights</p>
          </div>
          <div className="flex gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!response) return null;

  const blocks = parseResponse(response);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-fade-in">
      {/* Gradient header bar */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-base">
              {title || 'AI Analysis Report'}
            </h3>
            <p className="text-white/60 text-xs">Generated by SafeGuard AI Engine</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5">{blocks.map((block, i) => renderBlock(block, i))}</div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-gray-400">Analysis complete</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-50 to-blue-50 rounded-full border border-purple-100">
          <Sparkles size={12} className="text-purple-500" />
          <span className="text-[11px] font-medium text-purple-600">Powered by AI</span>
        </div>
      </div>
    </div>
  );
}
