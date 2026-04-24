import { useState } from 'react';
import { Map } from 'lucide-react';
import api from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

export default function AIRouteSafetyPage() {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await api.post('/api/ai/route-safety');
      if (res.data.success) {
        setResponse(res.data.data.analysis);
      } else {
        setError('Analysis failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to analyze route safety. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Map size={32} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>AI Route Safety Analysis</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '1rem' }}>
            Analyze safety of worker routes and locations based on historical data
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div style={{
        background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12,
        padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#0c4a6e', fontSize: '0.9rem', lineHeight: 1.6
      }}>
        <strong>What this analyzes:</strong> Worker travel routes, location incident history,
        time-of-day risk factors, area crime data, and environmental conditions to assess route safety scores.
      </div>

      {/* Run Button */}
      <button
        onClick={handleRun}
        disabled={loading}
        style={{
          background: loading ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          color: '#fff', border: 'none', borderRadius: 10, padding: '0.75rem 2rem',
          fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '1.5rem', transition: 'opacity 0.2s'
        }}
      >
        {loading ? 'Analyzing...' : 'Analyze Route Safety'}
      </button>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          padding: '0.75rem 1rem', color: '#991b1b', marginBottom: '1.5rem', fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {response && <AIResponseDisplay response={response} />}
    </div>
  );
}
