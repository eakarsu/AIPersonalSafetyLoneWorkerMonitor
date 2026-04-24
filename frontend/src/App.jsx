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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
