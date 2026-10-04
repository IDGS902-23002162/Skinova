import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  User,
  CalendarDays,
  LineChart,
  Stethoscope,
  Briefcase,
  Users,
  MessageCircle,
  Leaf,
  CloudSun,
  Crown,
  Sparkles,
  Bell,
  X
} from "lucide-react";
import "./Navigation.css";
import logoImage from "../../assets/nuevo-logo-letra.png";

const mainModules = [
  { id: "inicio", path: "/", label: "Inicio", icon: Home },
  { id: "rutinas", path: "/rutinas", label: "Rutinas", icon: CalendarDays },
  { id: "consulta", path: "/consulta", label: "Consulta IA", icon: Sparkles },
  { id: "neceser", path: "/neceser", label: "Mi Neceser", icon: Briefcase },
  { id: "progreso", path: "/progreso", label: "Progreso", icon: LineChart },
];

const secondaryModules = [
  { id: "habitos", path: "/habitos", label: "Hábitos", icon: Leaf },
  { id: "ambiente", path: "/ambiente", label: "Ambiente", icon: CloudSun },
  { id: "directorio", path: "/directorio", label: "Dermatólogos", icon: Stethoscope },
  { id: "comunidad", path: "/comunidad", label: "Comunidad", icon: MessageCircle },
  { id: "notificaciones", path: "/notificaciones", label: "Notificaciones", icon: Bell },
  { id: "premium", path: "/suscripciones", label: "Premium", icon: Crown },
];

export default function Navigation() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  // Close extended menu on route change in mobile
  useEffect(() => {
    setIsExpanded(false);
  }, [location.pathname]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <>
      <nav className={`skinova-nav ${isExpanded ? "expanded" : ""}`}>
        {/* Desktop Header */}
        <div className="nav-header">
          <div className="logo">
            <img src={logoImage} alt="Skinova" style={{ width: '100%', maxWidth: '150px', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Mobile drag indicator */}
        <div className="mobile-drag-indicator" onClick={toggleExpand}>
          <div className="drag-bar"></div>
        </div>

        <div className="nav-content">
          <div className="nav-section">
            <h3 className="section-title">PRINCIPAL</h3>
            <ul className="nav-list">
              {mainModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <li key={mod.id}>
                    <NavLink
                      to={mod.path}
                      className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                      end={mod.path === "/"}
                    >
                      <Icon className="nav-icon" size={22} />
                      <span className="nav-label">{mod.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={`nav-section secondary-section ${isExpanded ? "show-mobile" : ""}`}>
            <h3 className="section-title">MÁS OPCIONES</h3>
            <ul className="nav-list">
              {secondaryModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <li key={mod.id}>
                    <NavLink
                      to={mod.path}
                      className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                    >
                      <Icon className="nav-icon" size={22} />
                      <span className="nav-label">{mod.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Mobile close button (only visible when expanded) */}
        {isExpanded && (
          <button className="mobile-close-btn" onClick={() => setIsExpanded(false)}>
            <X size={24} />
          </button>
        )}
      </nav>
      {/* Overlay for mobile when expanded */}
      {isExpanded && <div className="nav-overlay" onClick={() => setIsExpanded(false)}></div>}
    </>
  );
}
