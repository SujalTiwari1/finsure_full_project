import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchApi } from '../services/api';
import { Loader2, ArrowLeft, ShieldAlert, HeartPulse } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function AnalysisDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const response = await fetchApi(`/analysis/${id}`);
        setData(response);
      } catch (err) {
        setError(err.message || 'Failed to load analysis results.');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalysis();
  }, [id]);

  if (loading) {
    return (
      <div className="full-center">
        <span className="loader" style={{ borderTop: '3px solid var(--primary)', borderRadius: '50%', width: 48, height: 48 }}/>
      </div>
    );
  }

  if (error || !data || !data.result) {
    return (
      <div className="full-center animate-fade-in" style={{ gap: '24px' }}>
        <ShieldAlert size={64} color="var(--danger)" />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Error Loading Data</h2>
          <p>{error}</p>
        </div>
        <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
      </div>
    );
  }

  const { result } = data;
  const cashflow = result.cash_flow || {};
  const risk = result.risk || {};
  const recs = result.recommendations || {};
  const txs = result.transactions || [];

  const pieData = cashflow.category_totals 
    ? Object.entries(cashflow.category_totals).map(([name, value]) => ({ name, value })) 
    : [];

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '48px', paddingBottom: '64px' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
        <Link to="/dashboard" className="btn btn-secondary" style={{ padding: '8px', borderRadius: '50%' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Analysis Results</h1>
          <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>
            Statement: <strong style={{ color: 'var(--primary)' }}>{data.originalFilename}</strong> • Evaluated on {new Date(data.createdAt).toLocaleDateString()}
          </p>
        </div>
      </header>

      {/* Grid top row: Cash Flow summary & Risk Score */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.5fr) minmax(300px, 1fr)', gap: '32px' }}>
        
        {/* Cash Flow */}
        <div className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px' }}>Aggregated Cash Flow</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            
            <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.05)' }}>
              <div style={{ fontSize: '12px', color: 'var(--secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Inflow</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--success)' }}>₹{cashflow.total_income?.toLocaleString() || 0}</div>
            </div>
            
            <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
              <div style={{ fontSize: '12px', color: 'var(--secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Outflow</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--danger)' }}>₹{cashflow.total_expenses?.toLocaleString() || 0}</div>
            </div>
            
            <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', background: 'rgba(59, 130, 246, 0.05)' }}>
              <div style={{ fontSize: '12px', color: 'var(--secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Savings Rate</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--brand)' }}>{cashflow.savings_rate_pct?.toFixed(1) || 0}%</div>
            </div>

          </div>

          {pieData.length > 0 && (
            <div style={{ height: '260px', width: '100%', minWidth: 0 }}>
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `₹${val.toLocaleString()}`} contentStyle={{ background: '#0a0a0a', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Risk Score */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '32px' }}>Risk Engine</h2>
          
          <div style={{ alignSelf: 'center', position: 'relative', width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: `conic-gradient(var(--brand) ${risk.fri_score || 0}%, #171717 0)` }}>
            <div style={{ width: '206px', height: '206px', background: 'var(--bg-surface)', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '56px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.04em', lineHeight: 1 }}>{Math.round(risk.fri_score || 0)}</span>
              <span style={{ fontSize: '13px', color: 'var(--secondary)', fontWeight: 500, marginTop: '8px' }}>FRI SCORE</span>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <span style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Level: {risk.risk_level || 'UNKNOWN'}
            </span>
          </div>

          {risk.breakdown && (
             <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '32px', paddingTop: '24px' }}>
               <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', color: 'var(--secondary)' }}>Scoring Factors</h4>
               <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {Object.entries(risk.breakdown).map(([k, v]) => {
                   let displayVal = v;
                   if (typeof v === 'object' && v !== null) {
                     displayVal = [v.score, v.label, v.message].filter(Boolean).join(' - ');
                   } else if (typeof v === 'number') {
                     displayVal = v.toFixed(2);
                   }
                   return (
                     <li key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                       <span style={{ color: 'var(--secondary)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                       <span style={{ fontWeight: 500 }}>{displayVal}</span>
                     </li>
                   );
                 })}
               </ul>
             </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '24px' }}>AI Protective Cover Suggestions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          
          {recs.term_insurance && (
             <div style={{ border: '1px solid var(--border-light)', borderRadius: '12px', padding: '24px', background: 'var(--bg-dark)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                 <ShieldAlert color="var(--brand)" size={24} />
                 <h3 style={{ fontSize: '16px' }}>Term Insurance Pipeline</h3>
               </div>
               <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '24px', color: 'var(--secondary)' }}>
                 {recs.term_insurance.reason || recs.term_insurance.logic || 'Standard life cover buffer generated by the inference engine.'}
               </p>
               <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>Calculated Minimum Requirement</span>
                 <strong style={{ fontSize: '18px', color: 'var(--primary)' }}>₹{(recs.term_insurance.required_cover || recs.term_insurance.suggested_cover_inr || 0).toLocaleString()}</strong>
               </div>
             </div>
          )}

          {recs.health_insurance && (
             <div style={{ border: '1px solid var(--border-light)', borderRadius: '12px', padding: '24px', background: 'var(--bg-dark)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                 <HeartPulse color="var(--danger)" size={24} />
                 <h3 style={{ fontSize: '16px' }}>Health Insurance Baseline</h3>
               </div>
               <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '24px', color: 'var(--secondary)' }}>
                 {Array.isArray(recs.health_insurance.reasons) ? recs.health_insurance.reasons.join(", ") : recs.health_insurance.logic || 'Base health cover dynamically analyzed using regional tiers.'}
               </p>
               <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>Calculated Base Protection</span>
                 <strong style={{ fontSize: '18px', color: 'var(--primary)' }}>₹{(recs.health_insurance.required_cover || recs.health_insurance.suggested_cover_inr || 0).toLocaleString()}</strong>
               </div>
             </div>
          )}

        </div>
      </div>

      {/* Transaction Table */}
      <div className="card animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '24px' }}>Event Log ({result.total_transactions} txs)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--secondary)' }}>
                <th style={{ padding: '16px', fontWeight: 500 }}>Date</th>
                <th style={{ padding: '16px', fontWeight: 500 }}>Description</th>
                <th style={{ padding: '16px', fontWeight: 500 }}>Type</th>
                <th style={{ padding: '16px', fontWeight: 500, textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ padding: '16px', fontWeight: 500 }}>ML Category</th>
              </tr>
            </thead>
            <tbody>
              {txs.slice(0, 50).map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s', cursor: 'default', ':hover': { background: 'rgba(255,255,255,0.02)' }}}>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>{t.date}</td>
                  <td style={{ padding: '14px 16px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--secondary)' }}>{t.description}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ 
                      display: 'inline-flex', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                      background: t.type === 'credit' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: t.type === 'credit' ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {t.type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500, fontFamily: 'monospace', fontSize: '14px' }}>
                    {t.amount?.toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--secondary)', fontSize: '12px' }}>
                      {t.category || 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {txs.length > 50 && (
             <div style={{ padding: '24px', textAlign: 'center', color: 'var(--secondary)', fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
               Showing chronological view (Max 50 results).
             </div>
          )}
        </div>
      </div>

    </div>
  );
}
