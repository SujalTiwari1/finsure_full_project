import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../services/api';
import { FileText, ArrowRight, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await fetchApi('/analysis');
        if (data && data.analyses) {
          setAnalyses(data.analyses);
        }
      } catch (err) {
        setError('Failed to load recent analyses.');
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '48px', maxWidth: '1000px' }}>
      <header>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Dashboard</h1>
        <p style={{ fontSize: '15px' }}>Welcome back, {user?.name}. Here's an overview of your financial inferences.</p>
      </header>

      {/* Quick Actions Action card */}
      <div className="card flex-between animate-slide-up" style={{ padding: '32px' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--brand)" /> Start New Analysis
          </h2>
          <p style={{ fontSize: '14px' }}>Upload a bank statement to generate AI categorizations and risk metrics.</p>
        </div>
        <Link to="/analyze" className="btn btn-primary" style={{ padding: '12px 24px' }}>
          Initialize <ArrowRight size={16} />
        </Link>
      </div>

      {/* History Grid */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
          Recent Activity
        </h3>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <span className="loader" style={{ borderTop: '2px solid var(--primary)', borderRadius: '50%', width: 24, height: 24, display: 'inline-block' }}/>
          </div>
        ) : error ? (
          <div style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</div>
        ) : analyses.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '64px 24px', background: 'transparent', borderStyle: 'dashed' }}>
            <FileText size={40} style={{ margin: '0 auto 16px', color: 'var(--secondary)' }} />
            <p>You haven't run any analyses yet.</p>
            <Link to="/analyze" className="btn btn-ghost" style={{ marginTop: '16px', color: 'var(--brand)' }}>
              Run your first analysis
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {analyses.map((doc, idx) => (
              <div 
                key={doc.id}
                className="card card-interactive"
                onClick={() => navigate(`/analysis/${doc.id}`)}
                style={{ position: 'relative', padding: '24px' }}
              >
                {doc.risk?.fri_score && (
                  <div style={{ position: 'absolute', top: 24, right: 24, fontSize: '13px', fontWeight: 600, color: 'var(--brand)' }}>
                    FRI Score: {Math.round(doc.risk.fri_score)}
                  </div>
                )}
                
                <h4 style={{ fontSize: '15px', marginBottom: '16px', paddingRight: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.originalFilename}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} /> 
                    {new Date(doc.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  
                  {doc.total_transactions > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} />
                      {doc.total_transactions} txs scanned
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
