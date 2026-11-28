import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  LogIn,
  LogOut,
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
  error: { label: "Error", icon: AlertTriangle, cls: "evt-error" },
  login: { label: "Inicio sesión", icon: LogIn, cls: "evt-login" },
  logout: { label: "Cierre sesión", icon: LogOut, cls: "evt-logout" },
  warning: { label: "Advertencia", icon: ShieldAlert, cls: "evt-warning" },
  info: { label: "Info", icon: Info, cls: "evt-info" },
  success: { label: "Éxito", icon: CheckCircle, cls: "evt-success" },
};

const INITIAL_COUNTS = {
  error: 0,
  login: 0,
  logout: 0,
  warning: 0,
  info: 0,
  success: 0,
};

// ── Fila de log con trazabilidad completa ──────────────────────────────────────
function LogRow({ type, message, purpose, result, target, ip, user, component, time }) {
  const { label, icon: Icon, cls } = EVENT_TYPES[type] ?? EVENT_TYPES.info;

  return (
    <div className={`bit-log-row ${cls}`}>
      <span className="bit-log-icon-wrap">
        <Icon size={15} />
      </span>

      <div className="bit-log-body">
        {/* QUÉ */}
        <span className="bit-log-message">{message}</span>

        {/* PARA QUÉ y RESULTADO */}
        {(purpose || result) && (
          <div className="bit-log-trace">
            {purpose && (
              <span className="bit-trace-item">
                <strong>Se realizó:</strong> {purpose}
              </span>
            )}
            {result && (
              <span className="bit-trace-item">
                <strong>Resultado:</strong> {result}
              </span>
            )}
          </div>
        )}

        {/* QUIÉN · MÓDULO · OBJETIVO/IP */}
        <span className="bit-log-meta">
          {user && (
            <>
              <strong>Quién:</strong> {user} ·{" "}
            </>
          )}
          {component && (
            <>
              <strong>Módulo:</strong>{" "}
              <span className="bit-log-component">{component}</span>
            </>
          )}
          {target && <> · <strong>Objetivo:</strong> {target}</>}
          {ip && <> · <strong>IP:</strong> {ip}</>}
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
  const [counts, setCounts] = useState(INITIAL_COUNTS);
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
        setCounts({ ...INITIAL_COUNTS, ...(data.counts || {}) });
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
      const hay = `${l.message || ""} ${l.purpose || ""} ${l.result || ""} ${l.target || ""} ${l.user || ""} ${l.component || ""} ${l.ip || ""}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const showSkeletons = loading && logs.length === 0;

  return (
    <div className="bit-root">
      <header className="mobil-header">
        <div className="mobil-header-top">
          <div className="mobil-header-tag">
            <ShieldAlert size={13} /> Módulo 4 · Auditoría
          </div>
          <div className="mobil-header-actions">
            <span className="bit-live-badge" style={{ border: "none", padding: "0 .5rem" }}>
              <span className="bit-live-dot" /> En vivo
            </span>
            <button
              type="button"
              className={`mobil-refresh-btn ${loading ? "is-loading" : ""}`}
              onClick={loadLogs}
              disabled={loading}
              title="Actualizar ahora"
            >
              <RefreshCw size={14} />
              <span className="mobil-refresh-label">Actualizar</span>
            </button>
          </div>
        </div>
        <h1 className="mobil-title">Bitácora y Seguridad</h1>
        <p className="mobil-subtitle">
          Trazabilidad de eventos del servidor, acciones y accesos de administradores
        </p>
      </header>

      {/* Resumen en grid simétrico */}
      <div className="bit-summary-row">
        {showSkeletons ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bit-summary-chip" style={{ pointerEvents: "none" }}>
              <div className="skel" style={{ width: 64, height: 14 }} />
              <div className="skel" style={{ width: 24, height: 18, borderRadius: 999 }} />
            </div>
          ))
        ) : (
          <>
            <button
              type="button"
              className={`bit-summary-chip evt-all ${activeFilter === "Todos" ? "selected" : ""}`}
              onClick={() => setActiveFilter("Todos")}
            >
              <span className="bit-chip-left">
                <Info size={14} />
                <span>Todos</span>
              </span>
              <span className="bit-chip-count">{logs.length}</span>
            </button>
            {Object.entries(EVENT_TYPES).map(([key, { label, icon: Icon, cls }]) => (
              <button
                type="button"
                key={key}
                className={`bit-summary-chip ${cls} ${activeFilter === key ? "selected" : ""}`}
                onClick={() => setActiveFilter(activeFilter === key ? "Todos" : key)}
              >
                <span className="bit-chip-left">
                  <Icon size={14} />
                  <span>{label}</span>
                </span>
                <span className="bit-chip-count">{counts[key] ?? 0}</span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="bit-toolbar">
        <div className="bit-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar (acción, propósito, resultado, usuario, módulo)…"
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
              onClick={() => {
                setActiveFilter("Todos");
                setOriginFilter("Todos");
                setSearch("");
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Logs */}
      <div className="bit-logs-list">
        {showSkeletons ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bit-log-row">
              <div className="skel" style={{ width: 32, height: 32, borderRadius: 8 }} />
              <div className="bit-log-body" style={{ gap: 6 }}>
                <div className="skel" style={{ width: "75%", height: 14 }} />
                <div className="skel" style={{ width: "45%", height: 11 }} />
              </div>
              <div className="bit-log-right">
                <div className="skel" style={{ width: 68, height: 20, borderRadius: 999 }} />
                <div className="skel" style={{ width: 72, height: 12 }} />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="bit-empty">No hay eventos que coincidan con los filtros.</div>
        ) : (
          filtered.map((log) => <LogRow key={log.id} {...log} />)
        )}
      </div>
    </div>
  );
}