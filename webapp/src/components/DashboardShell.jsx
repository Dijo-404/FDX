import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import "./DashboardShell.css";

export default function DashboardShell({ navItems, roleLabel, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="shell-root">
      <aside className={`shell-sidebar${navOpen ? " open" : ""}`}>
        <div className="shell-logo">
          <span className="shell-logo-mark">FDX</span>
          <span className="shell-logo-role">{roleLabel}</span>
        </div>

        <div className="shell-nav-wrap">
          <p className="shell-nav-label">Menu</p>
          <nav className="shell-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setNavOpen(false)}
                className={({ isActive }) => `shell-nav-item${isActive ? " active" : ""}`}
              >
                <Icon name={item.icon} size={17} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <button type="button" className="shell-logout" onClick={signOut}>
          <Icon name="logout" size={17} />
          <span>Log out</span>
        </button>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <button type="button" className="shell-menu" onClick={() => setNavOpen((value) => !value)} aria-label="Toggle navigation">
            <Icon name={navOpen ? "close" : "menu"} size={20} />
          </button>
          <div>
            <h1>{title}</h1>
            <p>{user?.organizationName ?? "Platform operations and governance"}</p>
          </div>

          <div className="shell-topbar-actions">
            <div className="shell-search">
              <Icon name="search" size={15} />
              <input type="text" placeholder="Search..." />
            </div>
            <button type="button" className="shell-alert" aria-label="Notifications"><Icon name="bell" size={18} /><span /></button>
            <div className="shell-avatar" title={user?.email}>
              {user?.name?.slice(0, 1) ?? "U"}
            </div>
          </div>
        </header>

        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
