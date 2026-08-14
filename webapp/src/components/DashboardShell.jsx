import { useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import "./DashboardShell.css";

function SidebarLogo() {
  return (
    <svg
      className="shell-logo-image"
      viewBox="157 320 1250 382"
      role="img"
      aria-labelledby="sidebar-logo-title sidebar-logo-description"
    >
      <title id="sidebar-logo-title">FDX</title>
      <desc id="sidebar-logo-description">FDX face delivery platform logo</desc>
      <defs>
        <filter
          id="sidebar-logo-light"
          x="-10%"
          y="-20%"
          width="120%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feComponentTransfer in="SourceAlpha" result="clean-alpha">
            <feFuncA type="gamma" amplitude="1" exponent="2" offset="0" />
          </feComponentTransfer>
          <feFlood floodColor="#f5f7ff" result="light-color" />
          <feComposite in="light-color" in2="clean-alpha" operator="in" />
        </filter>
        <clipPath id="sidebar-logo-accents">
          <rect x="432" y="390" width="45" height="46" rx="11" />
          <rect x="386" y="437" width="44" height="43" rx="11" />
          <rect x="444" y="465" width="93" height="91" rx="18" />
          <rect x="391" y="531" width="43" height="42" rx="10" />
          <rect x="436" y="574" width="44" height="45" rx="10" />
        </clipPath>
      </defs>

      <image
        href="/fdx-logo.png"
        width="1536"
        height="1024"
        filter="url(#sidebar-logo-light)"
      />
      <image
        href="/fdx-logo.png"
        width="1536"
        height="1024"
        clipPath="url(#sidebar-logo-accents)"
      />
    </svg>
  );
}

export default function DashboardShell({ navItems, roleLabel, title }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const hoverOpenTimer = useRef(null);
  const hoverCloseTimer = useRef(null);
  const openedByHover = useRef(false);
  const normalizedPath = pathname.replace(/\/+$/, "");
  const isOverview = ["/admin", "/organization"].includes(normalizedPath);
  const accountScope =
    user?.organizationName ??
    (user?.role === "super_admin" ? "FDX Platform" : roleLabel);
  const accountRole =
    {
      super_admin: "Super administrator",
      org_admin: "Organization administrator",
      staff: "Staff member",
    }[user?.role] ?? roleLabel;

  function clearHoverTimers() {
    window.clearTimeout(hoverOpenTimer.current);
    window.clearTimeout(hoverCloseTimer.current);
  }

  function scheduleAccountOpen(event) {
    if (event.pointerType !== "mouse" || accountOpen) return;
    window.clearTimeout(hoverCloseTimer.current);
    hoverOpenTimer.current = window.setTimeout(() => {
      openedByHover.current = true;
      setAccountOpen(true);
    }, 1000);
  }

  function scheduleAccountClose() {
    window.clearTimeout(hoverOpenTimer.current);
    if (!openedByHover.current) return;
    hoverCloseTimer.current = window.setTimeout(() => {
      openedByHover.current = false;
      setAccountOpen(false);
    }, 160);
  }

  function keepAccountOpen() {
    window.clearTimeout(hoverCloseTimer.current);
  }

  function handleAccountOpenChange(nextOpen) {
    clearHoverTimers();
    openedByHover.current = false;
    setAccountOpen(nextOpen);
  }

  useEffect(() => () => clearHoverTimers(), []);

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="shell-root">
      <aside className={`shell-sidebar${navOpen ? " open" : ""}`}>
        <div className="shell-logo">
          <SidebarLogo />
          <span className="shell-logo-role">{roleLabel}</span>
        </div>

        <div className="shell-nav-wrap">
          <p className="shell-nav-label">Menu</p>
          <nav className="shell-nav">
            {navItems
              .filter((item) => !item.roles || item.roles.includes(user?.role))
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setNavOpen(false)}
                  className={({ isActive }) =>
                    `shell-nav-item${isActive ? " active" : ""}`
                  }
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
          <button
            type="button"
            className="shell-menu"
            onClick={() => setNavOpen((value) => !value)}
            aria-label="Toggle navigation"
          >
            <Icon name={navOpen ? "close" : "menu"} size={20} />
          </button>
          <div>
            <h1>{title}</h1>
            <p>
              {user?.organizationName ?? "Platform operations and governance"}
            </p>
          </div>

          <div className="shell-topbar-actions">
            <Popover.Root
              open={accountOpen}
              onOpenChange={handleAccountOpenChange}
            >
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="shell-avatar"
                  aria-label="Open account details"
                  onPointerEnter={scheduleAccountOpen}
                  onPointerLeave={scheduleAccountClose}
                >
                  {user?.name?.slice(0, 1) ?? "U"}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="account-popover"
                  align="end"
                  sideOffset={10}
                  collisionPadding={16}
                  onPointerEnter={keepAccountOpen}
                  onPointerLeave={scheduleAccountClose}
                >
                  <div className="account-popover-head">
                    <span className="account-popover-avatar">
                      {user?.name?.slice(0, 1) ?? "U"}
                    </span>
                    <div>
                      <strong>{user?.name ?? "FDX user"}</strong>
                      <span>{user?.email}</span>
                    </div>
                  </div>
                  <div className="account-popover-details">
                    <div>
                      <span>Role</span>
                      <strong>{accountRole}</strong>
                    </div>
                    <div>
                      <span>Workspace</span>
                      <strong>{accountScope}</strong>
                    </div>
                    <div>
                      <span>Account status</span>
                      <strong className="account-status">
                        {user?.status?.toLowerCase() ?? "active"}
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="account-signout"
                    onClick={signOut}
                  >
                    <Icon name="logout" size={16} />
                    Sign out
                  </button>
                  <Popover.Arrow className="account-popover-arrow" />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </header>

        <main
          className={`shell-content${isOverview ? " shell-content-dashboard" : ""}`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
