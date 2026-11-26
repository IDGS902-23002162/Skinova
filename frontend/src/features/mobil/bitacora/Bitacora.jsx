import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  LogIn,
  AlertTriangle,
  Info,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
import "./Bitacora.css";

// ── Tipos de evento ────────────────────────────────────────────────────────────
const EVENT_TYPES = {
  error:   { label: "Error",         icon: AlertTriangle, cls: "evt-error"   },
  login:   { label: "Inicio sesión", icon: LogIn,         cls: "evt-login"   },
  warning: { label: "Advertencia",   icon: ShieldAlert,   cls: "evt-warning" },
  info:    { label: "Info",          icon: Info,          cls: "evt-info"    },
  success: { label: "Éxito",         icon: CheckCircle,   cls: "evt-success" },
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
      <div className="bit-log-right">
        <span className="bit-log-badge">{label}</span>
        <span className="bit-log-time">{time}</span>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function Bitacora() {
  const { fetchConAuth } = useApi();
  const [logs, setLogs] = useState([]);
  const [counts, setCounts] = useState({ error: 0, login: 0, warning: 0, info: 0, success: 0 });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [originFilter, setOriginFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetchConAuth("/mobil/bitacora");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setCounts(data.counts || { error: 0, login: 0, warning: 0, info: 0, success: 0 });
      }
    } catch (err) {
      console.error("Error cargando bitácora:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchConAuth]);

  useEffect(() => {
    loadLogs();
    const timer = setInterval(loadLogs, 15000);
    return () => clearInterval(timer);
  }, [loadLogs]);

  const query = search.trim().toLowerCase();
  const filtered = logs.filter((l) => {
    if (activeFilter !== "Todos" && l.type !== activeFilter) return false;
    if (originFilter === "sistema" && l.user !== "sistema") return false;
    if (originFilter === "usuario" && l.user === "sistema") return false;
    if (query) {
      const hay = `${l.message || ""} ${l.user || ""} ${l.component || ""}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  return (
    <div className="bit-root">
      <header className="bit-header">
        <div>
          <h1 className="bit-title">Bitácora y Seguridad</h1>
          <p className="bit-subtitle">Eventos internos del servidor y accesos de administradores</p>
        </div>
        <div className="bit-header-actions">
          <button type="button" className="bit-refresh-btn" onClick={loadLogs} title="Actualizar ahora">
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Actualizar
          </button>
          <span className="bit-live-badge">
            <span className="bit-live-dot" /> En vivo
          </span>
        </div>
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
            <span className="bit-chip-count">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bit-toolbar">
        <div className="bit-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en logs (mensaje, origen, módulo)…"
          />
        </div>
        <button
          type="button"
          className={`bit-filter-btn ${showFilters || originFilter !== "Todos" ? "active" : ""}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter size={15} /> Filtrar
        </button>
      </div>

      {showFilters && (
        <div className="bit-filter-panel">
          <span className="bit-filter-label">Origen:</span>
          {["Todos", "sistema", "usuario"].map((orig) => (
            <button
              key={orig}
              type="button"
              className={`bit-origin-pill ${originFilter === orig ? "selected" : ""}`}
              onClick={() => setOriginFilter(orig)}
            >
              {orig === "Todos" ? "Todos" : orig === "sistema" ? "Sistema" : "Administradores"}
            </button>
          ))}
          {(activeFilter !== "Todos" || originFilter !== "Todos" || search) && (
            <button
              type="button"
              className="bit-reset-btn"
              onClick={() => { setActiveFilter("Todos"); setOriginFilter("Todos"); setSearch(""); }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Logs */}
      <div className="bit-logs-list">
        {filtered.length === 0 ? (
          <div className="bit-empty">
            {loading ? "Cargando registros de bitácora..." : "No hay eventos que coincidan con los filtros."}
          </div>
        ) : (
          filtered.map((log) => <LogRow key={log.id} {...log} />)
        )}
      </div>
    </div>
  );
}

