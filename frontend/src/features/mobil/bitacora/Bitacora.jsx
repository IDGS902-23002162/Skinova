import React, { useState } from "react";
import {
  ShieldAlert,
  LogIn,
  AlertTriangle,
  Info,
  CheckCircle,
  Search,
  Filter,
} from "lucide-react";
import "./Bitacora.css";

// ── Tipos de evento ────────────────────────────────────────────────────────────
const EVENT_TYPES = {
  error:    { label: "Error",          icon: AlertTriangle, cls: "evt-error"   },
  login:    { label: "Inicio sesión",  icon: LogIn,         cls: "evt-login"   },
  warning:  { label: "Advertencia",   icon: ShieldAlert,   cls: "evt-warning" },
  info:     { label: "Info",           icon: Info,          cls: "evt-info"    },
  success:  { label: "Éxito",          icon: CheckCircle,   cls: "evt-success" },
};

// ── Fila de log ────────────────────────────────────────────────────────────────
function LogRow({ type, message, user, component, time }) {
  const { label, icon: Icon, cls } = EVENT_TYPES[type] ?? EVENT_TYPES.info;
  return (
    <div className={`bit-log-row ${cls}`}>
      <span className="bit-log-icon-wrap">
        <Icon size={15} />
      </span>
      <div className="bit-log-body">
        <span className="bit-log-message">{message}</span>
        <span className="bit-log-meta">
          {user && <><strong>{user}</strong> · </>}
          {component && <span className="bit-log-component">{component}</span>}
        </span>
      </div>
      <span className="bit-log-badge">{label}</span>
      <span className="bit-log-time">{time}</span>
    </div>
  );
}

const DEMO_LOGS = [
  { type: "error",   message: "TypeError: Cannot read property 'skin' of undefined",        user: "sistema",        component: "ConsultaIA.jsx",    time: "12:48:02" },
  { type: "login",   message: "Intento de inicio de sesión fallido (3er intento)",          user: "pedro@ex.com",   component: "useLogin.js",       time: "12:45:17" },
  { type: "warning", message: "Tiempo de respuesta de API Gemini > 2000ms",                 user: "sistema",        component: "geminiService.js",  time: "12:40:55" },
  { type: "success", message: "Suscripción Premium activada correctamente",                 user: "sofia@ex.com",   component: "Suscripciones",     time: "12:38:30" },
  { type: "info",    message: "Nuevo usuario registrado con Google OAuth",                  user: "nuevo@ex.com",   component: "useRegister.js",    time: "12:35:00" },
  { type: "error",   message: "Error 500 en /api/bitacora/save — SQLSTATE[23000]",          user: "sistema",        component: "BitacoraService",   time: "12:30:11" },
  { type: "login",   message: "Admin inició sesión desde IP 189.XXX.XXX.12",               user: "admin@skin.com", component: "AuthController",    time: "12:28:44" },
  { type: "warning", message: "Cuota de Clerk API al 80% del límite mensual",              user: "sistema",        component: "ClerkProvider",     time: "12:15:00" },
];

const FILTER_OPTIONS = ["Todos", "error", "login", "warning", "info", "success"];

// ── Componente principal ───────────────────────────────────────────────────────
export default function Bitacora() {
  const [activeFilter, setActiveFilter] = useState("Todos");

  const filtered =
    activeFilter === "Todos"
      ? DEMO_LOGS
      : DEMO_LOGS.filter((l) => l.type === activeFilter);

  return (
    <div className="bit-root">
      <header className="bit-header">
        <div>
          <h1 className="bit-title">Bitácora y Seguridad</h1>
          <p className="bit-subtitle">Excepciones, accesos y eventos del sistema</p>
        </div>
        <span className="bit-live-badge">
          <span className="bit-live-dot" /> En vivo
        </span>
      </header>

      {/* Resumen */}
      <div className="bit-summary-row">
        {Object.entries(EVENT_TYPES).map(([key, { label, icon: Icon, cls }]) => (
          <button
            key={key}
            className={`bit-summary-chip ${cls} ${activeFilter === key ? "selected" : ""}`}
            onClick={() => setActiveFilter(activeFilter === key ? "Todos" : key)}
          >
            <Icon size={14} />
            <span>{label}</span>
            <span className="bit-chip-count">
              {DEMO_LOGS.filter((l) => l.type === key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bit-toolbar">
        <div className="bit-search">
          <Search size={15} />
          <input placeholder="Buscar en logs…" />
        </div>
        <button className="bit-filter-btn">
          <Filter size={15} /> Filtrar
        </button>
      </div>

      {/* Logs */}
      <div className="bit-logs-list">
        {filtered.length === 0 ? (
          <div className="bit-empty">No hay eventos de este tipo.</div>
        ) : (
          filtered.map((log, i) => <LogRow key={i} {...log} />)
        )}
      </div>
    </div>
  );
}

