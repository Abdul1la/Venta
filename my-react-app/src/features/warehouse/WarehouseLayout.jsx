import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Store,
  Package,
  CreditCard,
  LogOut,
  Menu,
  X,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import NotificationCenter from "../../components/admin/NotificationCenter";
import { useTheme } from "../../components/ui/ThemeContext";

const SidebarItem = ({ to, icon: Icon, label, onClick }) => {
  const { t, i18n } = useTranslation();
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `btn ${isActive ? "active" : ""}`}
      style={({ isActive }) => ({
        width: "100%",
        justifyContent: "flex-start",
        padding: "12px 16px",
        background: isActive ? "var(--color-bg-app)" : "transparent",
        color: isActive
          ? "var(--color-primary)"
          : "var(--color-text-secondary)",
        marginBottom: "8px",
        borderRadius: "var(--radius-md)",
        fontWeight: isActive ? 600 : 500,
        boxShadow: "none",
      })}
    >
      <Icon
        size={20}
        style={{
          marginInlineEnd: "12px",
        }}
      />
      {label}
    </NavLink>
  );
};

const WarehouseLayout = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* MOBILE HEADER */}
      <div
        className="mobile-only"
        style={{
          padding: "16px",
          background: "var(--color-bg-card)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{ border: "none", background: "transparent", padding: 0 }}
          >
            <Menu size={24} color="var(--color-text-primary)" />
          </button>
          <span
            style={{
              fontWeight: "bold",
              fontSize: "18px",
              color: "var(--color-text-primary)",
            }}
          >
            {t("common.ventaAdmin")}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* OVERLAY for Mobile */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 40,
            }}
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={mobileMenuOpen ? "sidebar-open" : "sidebar-closed"}
          style={{
            width: "260px",
            background: "var(--color-bg-card)",
            borderInlineEnd: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            padding: "24px",
            position: window.innerWidth <= 768 ? "absolute" : "relative",
            height: "100%",
            zIndex: 50,
            transform:
              window.innerWidth <= 768 && !mobileMenuOpen
                ? `translateX(${i18n.dir() === "rtl" ? "100%" : "-100%"})`
                : "translateX(0)",
            transition: "transform 0.3s ease",
            boxShadow: mobileMenuOpen ? "4px 0 24px rgba(0,0,0,0.1)" : "none",
          }}
        >
          <div
            style={{
              marginBottom: "40px",
              paddingLeft: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    background: "var(--color-primary)",
                    color: "white",
                    borderRadius: "6px",
                    padding: "2px 6px",
                    fontSize: "14px",
                  }}
                >
                  M
                </span>
                MAX
              </h2>
              <span
                style={{ fontSize: "12px", color: "#999", fontWeight: 500 }}
              >
                {t("common.adminRole")}
              </span>
            </div>
            {/* Close but only visible on mobile inside sidebar */}
            {mobileMenuOpen && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="btn mobile-only"
                style={{ padding: "8px", background: "var(--color-bg-app)" }}
              >
                <X size={20} color="var(--color-text-primary)" />
              </button>
            )}
          </div>

          <nav style={{ flex: 1 }}>
            <SidebarItem
              to="/warehouse"
              icon={LayoutDashboard}
              label={t("common.dashboard")}
            />
            <SidebarItem
              to="/warehouse/branches"
              icon={Store}
              label={t("common.branches")}
            />
            <SidebarItem
              to="/warehouse/settings"
              icon={Settings}
              label={t("common.settings")}
            />
          </nav>

          <button
            onClick={handleLogout}
            className="btn"
            style={{
              justifyContent: "flex-start",
              color: "var(--color-error)",
              padding: "12px 16px",
              background: "transparent",
              marginTop: "auto",
            }}
          >
            <LogOut size={20} style={{ marginInlineEnd: "12px" }} />
            {t("auth.signOut")}
          </button>
        </aside>

        {/* Main Content Area with Header */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              height: "64px",
              background: "var(--color-bg-card)",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "0 32px",
            }}
          >
            <button
              onClick={toggleTheme}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div
              style={{
                width: "1px",
                height: "20px",
                background: "var(--color-border)",
                margin: "0 20px",
              }}
            />
            <NotificationCenter />
            <div
              style={{
                width: "1px",
                height: "20px",
                background: "var(--color-border)",
                margin: "0 20px",
              }}
            />
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--color-text-primary)",
              }}
            >
              {t("common.admin")}
            </div>
          </header>
          <main
            className="main-content"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "32px",
              background: "var(--color-bg-app)",
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default WarehouseLayout;
