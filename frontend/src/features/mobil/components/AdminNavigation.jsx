import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/react";
import {
  LayoutDashboard,
  Users,
  Activity,
  ShieldAlert,
  Settings,
  X,
  ChevronUp,
} from "lucide-react";
import "./AdminNavigation.css";

const adminModules = [
  {
    id: "dashboard",
    path: "/admin",
    label: "Dashboard",
    sublabel: "Analítica general",
    icon: LayoutDashboard,
  },
  {
    id: "usuarios",
    path: "/admin/usuarios",
    label: "Usuarios",
    sublabel: "Suscripciones",
    icon: Users,
  },
  {
    id: "rendimiento",
    path: "/admin/rendimiento",
    label: "Rendimiento",
    sublabel: "Sistema & APIs",
    icon: Activity,
  },
  {
    id: "bitacora",
    path: "/admin/bitacora",
    label: "Bitácora",
    sublabel: "Seguridad & Logs",
    icon: ShieldAlert,
  },
  {
    id: "administracion",
    path: "/admin/administracion",
    label: "Administración",
    sublabel: "Config & Notificaciones",
    icon: Settings,
  },
];

export default function AdminNavigation() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);
  const location = useLocation();

  // Cierra el menú expandido al cambiar de ruta en móvil
  useEffect(() => {
    setIsExpanded(false);
  }, [location.pathname]);

  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (touchStartY === null) return;
    const diff = touchStartY - e.touches[0].clientY;
    if (!isExpanded && diff > 40) {
      setIsExpanded(true);
      setTouchStartY(null);
    } else if (isExpanded && diff < -40) {
      setIsExpanded(false);
      setTouchStartY(null);
    }
  };

  const handleTouchEnd = () => setTouchStartY(null);

  return (
    <>
      {/* ── Sidebar Desktop ───────────────────────────────────────── */}
      <aside className="admin-nav-sidebar">
        <div className="admin-nav-brand">
          <span className="admin-nav-brand-icon">S</span>
          <span className="admin-nav-brand-name">Skinova</span>
          <span className="admin-nav-badge">Admin</span>
        </div>

        <nav className="admin-nav-list-desktop">
          <p className="admin-nav-section-label">PANEL</p>
          {adminModules.map(({ id, path, label, sublabel, icon: Icon }) => (
            <NavLink
              key={id}
              to={path}
              end={path === "/admin"}
              className={({ isActive }) =>
                `admin-nav-item-desktop ${isActive ? "active" : ""}`
              }
            >
              <span className="admin-nav-item-icon">
                <Icon size={20} strokeWidth={1.8} />
              </span>
              <span className="admin-nav-item-text">
                <span className="admin-nav-item-label">{label}</span>
                <span className="admin-nav-item-sublabel">{sublabel}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Footer con UserButton de Clerk */}
        <div className="admin-nav-sidebar-footer">
          <UserButton
            appearance={{
              variables: {
                colorPrimary: "#2D6658",
                colorText: "#F6F3EC",
                colorBackground: "#163B35",
                borderRadius: "10px",
              },
              elements: {
                userButtonAvatarBox: {
                  width: "34px",
                  height: "34px",
                },
              },
            }}
          />
          <span className="admin-nav-footer-label">Mi cuenta</span>
        </div>
      </aside>

      {/* ── Bottom Nav Mobile ─────────────────────────────────────── */}
      <nav
        className={`admin-nav-mobile ${isExpanded ? "expanded" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >

        {/* Items compactos (siempre visibles) */}
        <div className="admin-nav-mobile-row">
          {adminModules.map(({ id, path, label, icon: Icon }) => (
            <NavLink
              key={id}
              to={path}
              end={path === "/admin"}
              className={({ isActive }) =>
                `admin-nav-mobile-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={22} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Panel expandido con sublabels */}
        {isExpanded && (
          <div className="admin-nav-expanded-panel">
            <p className="admin-nav-section-label">MÓDULOS DE ADMINISTRACIÓN</p>
            {adminModules.map(({ id, path, label, sublabel, icon: Icon }) => (
              <NavLink
                key={id}
                to={path}
                end={path === "/admin"}
                className={({ isActive }) =>
                  `admin-nav-expanded-item ${isActive ? "active" : ""}`
                }
              >
                <span className="admin-nav-expanded-icon">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span className="admin-nav-expanded-text">
                  <span className="admin-nav-expanded-label">{label}</span>
                  <span className="admin-nav-expanded-sublabel">{sublabel}</span>
                </span>
              </NavLink>
            ))}
          </div>
        )}

        {isExpanded && (
          <button
            className="admin-nav-close-btn"
            onClick={() => setIsExpanded(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        )}
      </nav>

      {/* Overlay cuando está expandido en móvil */}
      {isExpanded && (
        <div
          className="admin-nav-overlay"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}

