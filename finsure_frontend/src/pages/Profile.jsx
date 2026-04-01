import { useAuth } from '../hooks/useAuth';
import { User as UserIcon } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>User Profile</h1>
        <p style={{ fontSize: '15px' }}>Your platform settings and stored demographics.</p>
      </header>

      <div className="card animate-slide-up" style={{ padding: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-dark)', border: '1px solid var(--border-highlight)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <UserIcon size={32} color="var(--brand)" />
          </div>
          <div>
             <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{user.name}</h2>
             <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>{user.email}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '12px', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Age</div>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>{user.age || '—'}</div>
          </div>
          
          <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '12px', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>City</div>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>{user.city || '—'}</div>
          </div>
          
          <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '12px', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Reported Income</div>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>{user.income ? `₹${user.income.toLocaleString()}` : '—'}</div>
          </div>

          <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '12px', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Dependents</div>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>{user.dependents || '0'}</div>
          </div>

        </div>
      </div>
    </div>
  );
}
