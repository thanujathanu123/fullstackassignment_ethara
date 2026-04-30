import { FolderKanban, LayoutDashboard, LogOut } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">TT</span>
          <div>
            <strong>Team Tasks</strong>
            <span>{user?.name}</span>
          </div>
        </div>

        <nav className="nav-list">
          <NavLink to="/dashboard">
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          <NavLink to="/projects">
            <FolderKanban size={18} />
            Projects
          </NavLink>
        </nav>

        <button className="ghost-button" type="button" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
