import { useLocation } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import Sidebar from './Sidebar';

const pageTitles = {
  '/': 'Dashboard',
  '/workers': 'Workers',
  '/checkins': 'Check-ins',
  '/locations': 'Locations',
  '/incidents': 'Incidents',
  '/emergencies': 'Emergencies',
  '/hazards': 'Hazards',
  '/compliance': 'Compliance',
  '/shifts': 'Shifts',
  '/training': 'Training',
  '/equipment': 'Equipment',
  '/ai/risk-assessment': 'AI Risk Assessment',
  '/ai/incident-analysis': 'AI Incident Analysis',
  '/ai/anomaly-detection': 'AI Anomaly Detection',
  '/ai/emergency-response': 'AI Emergency Response',
  '/ai/route-safety': 'AI Route Safety',
  '/ai/compliance-predictor': 'AI Compliance Predictor',
  '/ai/shift-optimizer': 'AI Shift Optimizer',
  '/ai/hazard-prediction': 'AI Hazard Prediction',
  '/ai/training-recommender': 'AI Training Recommender',
  '/ai/safety-report': 'AI Safety Report',
};

const getBreadcrumbs = (pathname) => {
  if (pathname === '/') return ['Dashboard'];
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((seg) =>
    seg
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
};

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || 'Page';
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={12} />}
                  <span className={i === breadcrumbs.length - 1 ? 'text-gray-600' : ''}>
                    {crumb}
                  </span>
                </span>
              ))}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-semibold">
                {user?.name
                  ? user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                  : 'U'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-700">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-400">{user?.role || 'Admin'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
