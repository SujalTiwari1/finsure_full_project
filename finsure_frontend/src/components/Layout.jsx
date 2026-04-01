import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, FileBarChart, User, LogOut, ShieldCheck } from 'lucide-react';

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label }) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link 
        to={to} 
        className={`btn btn-ghost ${active ? 'active' : ''}`} 
        style={{ 
          justifyContent: 'flex-start', 
          padding: '10px 16px', 
          borderRadius: '8px', 
          fontSize: '14px', 
          position: 'relative' 
        }}
      >
        <Icon size={18} style={{ opacity: active ? 1 : 0.6 }} /> 
        {label}
        {active && (
          <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 2, background: 'var(--primary)', borderRadius: '0 4px 4px 0' }} />
        )}
      </Link>
    );
  };

  return (
    <div className="page-wrapper animate-fade-in">
      <aside className="layout-sidebar">
        <div style={{ padding: '12px 16px 40px' }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 600 }}>
            <ShieldCheck size={24} /> FinSure
          </Link>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/analyze" icon={FileBarChart} label="New Analysis" />
          <NavItem to="/profile" icon={User} label="Profile" />
        </nav>
        
        <button 
          onClick={handleLogout} 
          className="btn btn-ghost" 
          style={{ justifyContent: 'flex-start', padding: '10px 16px', color: 'var(--secondary)' }}
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
