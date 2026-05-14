import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import api from './services/api';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WorkersPage from './pages/WorkersPage';
import IncidentsPage from './pages/IncidentsPage';
import CheckinsPage from './pages/CheckinsPage';
import EmergenciesPage from './pages/EmergenciesPage';
import LocationsPage from './pages/LocationsPage';
import CompliancePage from './pages/CompliancePage';
import ShiftsPage from './pages/ShiftsPage';
import HazardsPage from './pages/HazardsPage';
import TrainingPage from './pages/TrainingPage';
import EquipmentPage from './pages/EquipmentPage';
import AIRiskAssessmentPage from './pages/AIRiskAssessmentPage';
import AIIncidentAnalysisPage from './pages/AIIncidentAnalysisPage';
import AIAnomalyDetectionPage from './pages/AIAnomalyDetectionPage';
import AIEmergencyResponsePage from './pages/AIEmergencyResponsePage';
import AIRouteSafetyPage from './pages/AIRouteSafetyPage';
import AICompliancePredictorPage from './pages/AICompliancePredictorPage';
import AIShiftOptimizerPage from './pages/AIShiftOptimizerPage';
import AIHazardPredictionPage from './pages/AIHazardPredictionPage';
import AITrainingRecommenderPage from './pages/AITrainingRecommenderPage';
import AISafetyReportPage from './pages/AISafetyReportPage';
import HeartbeatMapPage from './pages/HeartbeatMapPage';
import GeofencesPage from './pages/GeofencesPage';
import AIHistoryPage from './pages/AIHistoryPage';
import CheckInDashboardPage from './pages/CheckInDashboardPage';
import RiskAssessToolPage from './pages/RiskAssessToolPage';
import EmergencyResponseDisplayPage from './pages/EmergencyResponseDisplayPage';
import SafetyBriefingPage from './pages/SafetyBriefingPage';
import IncidentReportBuilderPage from './pages/IncidentReportBuilderPage';
import AIPredictivePage from './pages/AIPredictivePage';

// // === Batch 06 Gaps & Frontend Mounts ===
import CFAgenticSafetyOrchestrationPage from './pages/CFAgenticSafetyOrchestrationPage';
import CFComputerVisionIncidentDetectionPage from './pages/CFComputerVisionIncidentDetectionPage';
import CFBehavioralRiskProfilingPage from './pages/CFBehavioralRiskProfilingPage';
import CFEnvironmentalHazardSensingPage from './pages/CFEnvironmentalHazardSensingPage';
import CFPeerSafetyNetworksPage from './pages/CFPeerSafetyNetworksPage';
import GapEquipmentWithoutEquipmentPage from './pages/GapEquipmentWithoutEquipmentPage';
import GapComplianceWithoutAuditPage from './pages/GapComplianceWithoutAuditPage';
import GapShiftsWithoutBurnoutPage from './pages/GapShiftsWithoutBurnoutPage';
import GapNoWearableDeviceIntegrationSmartwatchBeaconPage from './pages/GapNoWearableDeviceIntegrationSmartwatchBeaconPage';
import GapNoIntegrationWithEmergencyServices911AutoPage from './pages/GapNoIntegrationWithEmergencyServices911AutoPage';
import GapNoRealPage from './pages/GapNoRealPage';
import GapLimitedMultiPage from './pages/GapLimitedMultiPage';
import GapNoNotificationsModuleDedicatedRouteReliesOnPage from './pages/GapNoNotificationsModuleDedicatedRouteReliesOnPage';
import GapNoWebhooksForExternalDispatchSystemsPage from './pages/GapNoWebhooksForExternalDispatchSystemsPage';
import GapNoNativeMobileAppDespiteFieldPage from './pages/GapNoNativeMobileAppDespiteFieldPage';
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.data.user));
      setUser(res.data.data.user);
    } else {
      throw new Error(res.data.error || 'Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <Layout user={user} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/workers" element={<WorkersPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/checkins" element={<CheckinsPage />} />
        <Route path="/emergencies" element={<EmergenciesPage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/shifts" element={<ShiftsPage />} />
        <Route path="/hazards" element={<HazardsPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/ai/risk-assessment" element={<AIRiskAssessmentPage />} />
        <Route path="/ai/incident-analysis" element={<AIIncidentAnalysisPage />} />
        <Route path="/ai/anomaly-detection" element={<AIAnomalyDetectionPage />} />
        <Route path="/ai/emergency-response" element={<AIEmergencyResponsePage />} />
        <Route path="/ai/route-safety" element={<AIRouteSafetyPage />} />
        <Route path="/ai/compliance-predictor" element={<AICompliancePredictorPage />} />
        <Route path="/ai/shift-optimizer" element={<AIShiftOptimizerPage />} />
        <Route path="/ai/hazard-prediction" element={<AIHazardPredictionPage />} />
        <Route path="/ai/training-recommender" element={<AITrainingRecommenderPage />} />
        <Route path="/ai/safety-report" element={<AISafetyReportPage />} />
        <Route path="/ai/history" element={<AIHistoryPage />} />
        <Route path="/heartbeat-map" element={<HeartbeatMapPage />} />
        <Route path="/geofences" element={<GeofencesPage />} />
        <Route path="/checkin-dashboard" element={<CheckInDashboardPage />} />
        <Route path="/ai/risk-assess" element={<RiskAssessToolPage />} />
        <Route path="/ai/emergency-display" element={<EmergencyResponseDisplayPage />} />
        <Route path="/ai/safety-briefing" element={<SafetyBriefingPage />} />
        <Route path="/ai/incident-report" element={<IncidentReportBuilderPage />} />
        <Route path="/ai/predictive" element={<AIPredictivePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      
          {/* // === Batch 06 Gaps & Frontend Mounts === */}
          <Route path="/cf-agentic-safety-orchestration" element={<CFAgenticSafetyOrchestrationPage />} />
          <Route path="/cf-computer-vision-incident-detection" element={<CFComputerVisionIncidentDetectionPage />} />
          <Route path="/cf-behavioral-risk-profiling" element={<CFBehavioralRiskProfilingPage />} />
          <Route path="/cf-environmental-hazard-sensing" element={<CFEnvironmentalHazardSensingPage />} />
          <Route path="/cf-peer-safety-networks" element={<CFPeerSafetyNetworksPage />} />
          <Route path="/gap-equipment-without-equipment" element={<GapEquipmentWithoutEquipmentPage />} />
          <Route path="/gap-compliance-without-audit" element={<GapComplianceWithoutAuditPage />} />
          <Route path="/gap-shifts-without-burnout" element={<GapShiftsWithoutBurnoutPage />} />
          <Route path="/gap-no-wearable-device-integration-smartwatch-beacon" element={<GapNoWearableDeviceIntegrationSmartwatchBeaconPage />} />
          <Route path="/gap-no-integration-with-emergency-services-911-auto" element={<GapNoIntegrationWithEmergencyServices911AutoPage />} />
          <Route path="/gap-no-real" element={<GapNoRealPage />} />
          <Route path="/gap-limited-multi" element={<GapLimitedMultiPage />} />
          <Route path="/gap-no-notifications-module-dedicated-route-relies-on-" element={<GapNoNotificationsModuleDedicatedRouteReliesOnPage />} />
          <Route path="/gap-no-webhooks-for-external-dispatch-systems" element={<GapNoWebhooksForExternalDispatchSystemsPage />} />
          <Route path="/gap-no-native-mobile-app-despite-field" element={<GapNoNativeMobileAppDespiteFieldPage />} />
        </Routes>
    </Layout>
  );
}
