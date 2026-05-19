import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardCheck, MapPin,
  AlertTriangle, Siren, ShieldAlert, FileCheck,
  Clock, GraduationCap, Wrench,
  Brain, Search, Activity, Zap, Route, TrendingUp,
  Settings, Eye, BookOpen, FileText,
  Shield, ChevronLeft, ChevronRight, LogOut, Sparkles,
  Radio, AlertTriangle as TriangleAlert, History, MonitorCheck, AlertOctagon, ClipboardList, Megaphone
} from 'lucide-react';

const navSections = [
  {
    title: 'MONITORING',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { label: 'Workers', icon: Users, path: '/workers' },
      { label: 'Check-ins', icon: ClipboardCheck, path: '/checkins' },
      { label: 'Check-In Dashboard', icon: MonitorCheck, path: '/checkin-dashboard' },
      { label: 'Locations', icon: MapPin, path: '/locations' },
      { label: 'Heartbeat Map', icon: Radio, path: '/heartbeat-map' },
      { label: 'Geofences', icon: TriangleAlert, path: '/geofences' },
      { label: 'Safety Views', icon: Eye, path: '/custom-views' },
  // === Batch 06 Gaps & Frontend Mounts ===
  { path: '/cf-agentic-safety-orchestration', label: 'Agentic safety orchestration', icon: '✨' },
  { path: '/cf-computer-vision-incident-detection', label: 'Computer vision incident detection', icon: '✨' },
  { path: '/cf-behavioral-risk-profiling', label: 'Behavioral risk profiling', icon: '✨' },
  { path: '/cf-environmental-hazard-sensing', label: 'Environmental hazard sensing', icon: '✨' },
  { path: '/cf-peer-safety-networks', label: 'Peer safety networks', icon: '✨' },
  { path: '/gap-equipment-without-equipment', label: 'Equipment without `/equipment', icon: '✨' },
  { path: '/gap-compliance-without-audit', label: 'Compliance without `/audit', icon: '✨' },
  { path: '/gap-shifts-without-burnout', label: 'Shifts without `/burnout', icon: '✨' },
  { path: '/gap-no-wearable-device-integration-smartwatch-beacon', label: 'No wearable device integration (smartwatch, beacon)', icon: '✨' },
  { path: '/gap-no-integration-with-emergency-services-911-auto', label: 'No integration with emergency services (911 auto', icon: '✨' },
  { path: '/gap-no-real', label: 'No real', icon: '✨' },
  { path: '/gap-limited-multi', label: 'Limited multi', icon: '✨' },
  { path: '/gap-no-notifications-module-dedicated-route-relies-on-', label: 'No notifications module dedicated route (relies on SOS/emergency only)', icon: '✨' },
  { path: '/gap-no-webhooks-for-external-dispatch-systems', label: 'No webhooks for external dispatch systems', icon: '✨' },
  { path: '/gap-no-native-mobile-app-despite-field', label: 'No native mobile app despite field', icon: '✨' }
],
  },
  {
    title: 'SAFETY',
    items: [
      { label: 'Incidents', icon: AlertTriangle, path: '/incidents' },
      { label: 'Emergencies', icon: Siren, path: '/emergencies' },
      { label: 'Hazards', icon: ShieldAlert, path: '/hazards' },
      { label: 'Compliance', icon: FileCheck, path: '/compliance' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Shifts', icon: Clock, path: '/shifts' },
      { label: 'Training', icon: GraduationCap, path: '/training' },
      { label: 'Equipment', icon: Wrench, path: '/equipment' },
    ],
  },
  {
    title: 'AI CENTER',
    isAI: true,
    items: [
      { label: 'Risk Assessment', icon: Brain, path: '/ai/risk-assessment' },
      { label: 'Incident Analysis', icon: Search, path: '/ai/incident-analysis' },
      { label: 'Anomaly Detection', icon: Activity, path: '/ai/anomaly-detection' },
      { label: 'Emergency Response', icon: Zap, path: '/ai/emergency-response' },
      { label: 'Route Safety', icon: Route, path: '/ai/route-safety' },
      { label: 'Compliance Predictor', icon: TrendingUp, path: '/ai/compliance-predictor' },
      { label: 'Shift Optimizer', icon: Settings, path: '/ai/shift-optimizer' },
      { label: 'Hazard Prediction', icon: Eye, path: '/ai/hazard-prediction' },
      { label: 'Training Recommender', icon: BookOpen, path: '/ai/training-recommender' },
      { label: 'Safety Report', icon: FileText, path: '/ai/safety-report' },
      { label: 'AI History', icon: History, path: '/ai/history' },
      { label: 'Risk Assess Tool', icon: AlertOctagon, path: '/ai/risk-assess' },
      { label: 'Emergency Display', icon: Zap, path: '/ai/emergency-display' },
      { label: 'Safety Briefing', icon: Megaphone, path: '/ai/safety-briefing' },
      { label: 'Incident Report Builder', icon: ClipboardList, path: '/ai/incident-report' },
      { label: 'Predictive Tools', icon: Brain, path: '/ai/predictive' },
    ],
  },
];

export default function Sidebar({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } bg-dark-900 text-white flex flex-col h-screen transition-all duration-300 ease-in-out flex-shrink-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
          <Shield size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold leading-tight tracking-tight">
              SafeGuard <span className="text-primary-400">AI</span>
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              Lone Worker Monitor
            </p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-5 -right-3 w-6 h-6 bg-dark-800 border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-dark-700 transition-colors z-10"
        style={{ left: collapsed ? '68px' : '244px' }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            {/* Section header */}
            {!collapsed ? (
              <div className="flex items-center gap-2 mb-2 px-2">
                {section.isAI && <Sparkles size={12} className="text-purple-400" />}
                <span
                  className={`text-[11px] font-semibold tracking-wider ${
                    section.isAI
                      ? 'bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent'
                      : 'text-gray-500'
                  }`}
                >
                  {section.title}
                </span>
              </div>
            ) : (
              <div className="h-px bg-white/10 mb-3 mx-2" />
            )}

            {/* AI section accent bar */}
            {section.isAI && !collapsed && (
              <div className="h-0.5 mx-2 mb-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 opacity-40" />
            )}

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isStringIcon = typeof Icon !== 'function';
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                        active
                          ? section.isAI
                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white'
                            : 'bg-primary-500/15 text-primary-400'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      } ${collapsed ? 'justify-center' : ''}`}
                    >
                      {isStringIcon ? (
                        <span style={{ fontSize: 16, lineHeight: 1 }}>{String(Icon)}</span>
                      ) : (
                        <Icon
                          size={18}
                          className={
                            active
                              ? section.isAI
                                ? 'text-purple-400'
                                : 'text-primary-400'
                              : ''
                          }
                        />
                      )}
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {active && !collapsed && (
                        <div
                          className={`ml-auto w-1.5 h-1.5 rounded-full ${
                            section.isAI
                              ? 'bg-purple-400'
                              : 'bg-primary-400'
                          }`}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info & logout */}
      <div className="border-t border-white/10 p-4">
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
