import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { UploadCloud, File, Info } from 'lucide-react';

export default function Analyze() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    income: user?.income || '',
    age: user?.age || '',
    city: user?.city || '',
    dependents: user?.dependents || '0',
    existing_term: '0',
    existing_health: '0'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type !== 'application/pdf') {
       setError("Only PDF files are supported.");
       setFile(null);
    } else {
       setError('');
       setFile(selected);
    }
  };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a bank statement PDF.");
      return;
    }

    setLoading(true);
    setError('');

    const payload = new FormData();
    payload.append('file', file);
    payload.append('income', formData.income.toString());
    payload.append('age', formData.age.toString());
    payload.append('city', formData.city);
    payload.append('dependents', formData.dependents.toString());
    if (formData.existing_term) payload.append('existing_term', formData.existing_term.toString());
    if (formData.existing_health) payload.append('existing_health', formData.existing_health.toString());

    try {
      const resp = await fetchApi('/analyze', {
        method: 'POST',
        body: payload
      });
      if (resp?.analysisId) {
        navigate(`/analysis/${resp.analysisId}`);
      } else {
        throw new Error("Invalid response format from ML backend.");
      }
    } catch (err) {
      setError(err.message || "Analysis failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Launch Analysis</h1>
        <p style={{ fontSize: '15px' }}>Feed the machine learning pipeline with your financial statement.</p>
      </header>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', marginBottom: '32px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card full-center" style={{ minHeight: '400px', gap: '24px' }}>
          <span className="loader" style={{ borderTop: '3px solid var(--primary)', borderRadius: '50%', width: 48, height: 48 }}/>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Processing Statement</h2>
            <p style={{ fontSize: '14px' }}>Our ML models are projecting cash flows and parsing transactions.<br/>This takes roughly 15 to 30 seconds.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '40px', padding: '40px' }}>
          
          {/* Section 1: Dropzone */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '16px', color: 'var(--primary)' }}>1. Document Upload</h3>
            <div 
              style={{ 
                border: '1px dashed var(--border-highlight)', 
                borderRadius: 'var(--radius-md)', 
                padding: '48px 24px', 
                textAlign: 'center',
                background: 'rgba(255,255,255,0.01)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => document.getElementById('pdf-upload').click()}
            >
              <input 
                id="pdf-upload" 
                type="file" 
                accept="application/pdf" 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
              />
              {file ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <File size={32} color="var(--success)" />
                  <span style={{ fontWeight: 500, fontSize: '14px', color: 'var(--primary)' }}>{file.name}</span>
                  <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <UploadCloud size={32} color="var(--secondary)" style={{ opacity: 0.5 }} />
                  <div>
                    <span style={{ fontWeight: 500, fontSize: '14px', color: 'var(--primary)', display: 'block' }}>PDF Statement up to 10MB</span>
                    <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>Click or drag a file here to upload.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <hr style={{ margin: 0 }} />

          {/* Section 2: Form */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--primary)', margin: 0 }}>2. Evaluation Parameters</h3>
              <Info size={14} color="var(--secondary)" title="These adjust the AI's risk multipliers." style={{ cursor: 'help' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div className="form-group">
                <label className="form-label">Monthly Income (₹)</label>
                <input name="income" type="number" className="form-input" value={formData.income} onChange={handleChange} required min={1} />
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input name="age" type="number" className="form-input" value={formData.age} onChange={handleChange} required min={18} max={70} />
              </div>
              <div className="form-group">
                <label className="form-label">Location (e.g. Mumbai)</label>
                <input name="city" type="text" className="form-input" value={formData.city} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Dependents</label>
                <input name="dependents" type="number" className="form-input" value={formData.dependents} onChange={handleChange} required min={0} />
              </div>
            </div>
          </div>

          <hr style={{ margin: 0 }} />

          {/* Section 3: Advanced */}
          <div>
             <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '24px', color: 'var(--primary)' }}>3. Existing Insurance (Optional)</h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div className="form-group">
                <label className="form-label">Active Term Cover (₹)</label>
                <input name="existing_term" type="number" className="form-input" value={formData.existing_term} onChange={handleChange} min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">Active Health Cover (₹)</label>
                <input name="existing_health" type="number" className="form-input" value={formData.existing_health} onChange={handleChange} min={0} />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '15px', marginTop: '16px' }}>
            Execute Pipeline
          </button>
        </form>
      )}
    </div>
  );
}
