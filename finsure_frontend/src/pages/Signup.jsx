import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck } from 'lucide-react';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', age: '', city: '', dependents: '0', income: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup({
        ...formData,
        age: Number(formData.age),
        dependents: Number(formData.dependents),
        income: Number(formData.income)
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="full-center" style={{ padding: '40px 20px' }}>
      <div className="card animate-slide-up" style={{ width: '100%', maxWidth: '540px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <ShieldCheck size={36} style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Create an Account</h2>
          <p style={{ fontSize: '14px' }}>Join FinSure for intelligent financial planning.</p>
        </div>

        {error && (
          <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', marginBottom: '24px', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Full Name</label>
            <input name="name" type="text" className="form-input" value={formData.name} onChange={handleChange} required />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Email address</label>
            <input name="email" type="email" className="form-input" value={formData.email} onChange={handleChange} required />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Password (min 8 chars)</label>
            <input name="password" type="password" className="form-input" value={formData.password} onChange={handleChange} required minLength={8} />
          </div>

          <div className="form-group">
            <label className="form-label">Age</label>
            <input name="age" type="number" className="form-input" value={formData.age} onChange={handleChange} required min={18} max={100} />
          </div>

          <div className="form-group">
            <label className="form-label">City Tier / Location</label>
            <input name="city" type="text" className="form-input" value={formData.city} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Monthly Income (₹)</label>
            <input name="income" type="number" className="form-input" value={formData.income} onChange={handleChange} required min={0} />
          </div>

          <div className="form-group">
            <label className="form-label">Total Dependents</label>
            <input name="dependents" type="number" className="form-input" value={formData.dependents} onChange={handleChange} required min={0} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ gridColumn: '1 / -1', padding: '12px', marginTop: '16px', fontSize: '15px' }}>
            {loading ? <span className="loader" style={{ borderTop: '2px solid #000', borderRadius: '50%', width: 18, height: 18, display: 'inline-block' }}/> : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
