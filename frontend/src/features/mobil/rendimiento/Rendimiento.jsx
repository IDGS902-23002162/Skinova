import React from "react";
import {
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart2,
  ArrowRight,
} from "lucide-react";
import "./Rendimiento.css";

// ── Metric Card ────────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, unit, status, color }) {
  return (
    <div className="rend-metric-card" style={{ "--accent": color }}>
      <div className="rend-metric-top">
        <Icon size={20} />
        <span className={`rend-status-dot ${status}`} title={status} />
      </div>
      <span className="rend-metric-value">
        {value}<small>{unit}</small>
      </span>
      <span className="rend-metric-label">{label}</span>
    </div>
  );
}

// ── Endpoint Row ───────────────────────────────────────────────────────────────
function EndpointRow({ method, path, calls, avgMs, errors }) {
  const methodColors = { GET: "#2D6658", POST: "#A9C4B5", DELETE: "#C98268", PATCH: "#E7DFD2" };
  return (
    <div className="rend-endpoint-row">
      <span className="rend-method" style={{ background: methodColors[method] ?? "#163B35" }}>
        {method}
      </span>
      <span className="rend-path">{path}</span>
      <span className="rend-calls">{calls.toLocaleString()} llamadas</span>
      <span className="rend-avg">{avgMs}ms prom.</span>
      <span className={`rend-errors ${errors > 0 ? "has-errors" : ""}`}>
        {errors > 0 ? `${errors} errores` : "✓ OK"}
      </span>
    </div>
  );
}

const ENDPOINTS = [
  { method: "GET",    path: "/api/user/profile",         calls: 18420, avgMs: 84,  errors: 0  },
  { method: "POST",   path: "/api/consulta/ia",          calls: 9201,  avgMs: 320, errors: 12 },
  { method: "GET",    path: "/api/rutinas",              calls: 7840,  avgMs: 61,  errors: 0  },
  { method: "POST",   path: "/api/bitacora",             calls: 5120,  avgMs: 102, errors: 3  },
  { method: "DELETE", path: "/api/suscripciones/cancel", calls: 390,   avgMs: 145, errors: 1  },
];

// ── Componente principal ───────────────────────────────────────────────────────
export default function Rendimiento() {
  return (
    <div className="rend-root">
      <header className="rend-header">
        <div>
          <h1 className="rend-title">Rendimiento del Sistema</h1>
          <p className="rend-subtitle">Tiempos de respuesta, peticiones y disponibilidad</p>
        </div>
        <span className="rend-live-badge">
          <span className="rend-live-dot" /> En vivo
        </span>
      </header>

      {/* Métricas clave */}
      <div className="rend-metrics-grid">
        <MetricCard icon={Zap}           label="Tiempo prom. respuesta" value="97"    unit="ms"   status="ok"      color="#2D6658" />
        <MetricCard icon={BarChart2}     label="Peticiones hoy"         value="48.2"  unit="k"    status="ok"      color="#A9C4B5" />
        <MetricCard icon={CheckCircle}   label="Disponibilidad"         value="99.8"  unit="%"    status="ok"      color="#163B35" />
        <MetricCard icon={AlertTriangle} label="Errores detectados"     value="16"    unit="err"  status="warning" color="#C98268" />
        <MetricCard icon={Clock}         label="Uptime acumulado"       value="99.1"  unit="%"    status="ok"      color="#2D6658" />
      </div>

      {/* Endpoints más solicitados */}
      <section className="rend-section">
        <div className="rend-section-head">
          <h2 className="rend-section-title">Endpoints más solicitados</h2>
          <button className="rend-link-btn">Ver todos <ArrowRight size={14} /></button>
        </div>
        <div className="rend-endpoints-table">
          <div className="rend-endpoints-header">
            <span>Método</span>
            <span>Ruta</span>
            <span>Volumen</span>
            <span>Prom.</span>
            <span>Estado</span>
          </div>
          {ENDPOINTS.map((ep) => (
            <EndpointRow key={ep.path} {...ep} />
          ))}
        </div>
      </section>

      {/* Gráfica placeholder */}
      <section className="rend-section">
        <h2 className="rend-section-title">Peticiones por hora</h2>
        <div className="rend-chart-ph">
          <BarChart2 size={44} strokeWidth={1} />
          <p>Gráfica en tiempo real próximamente</p>
        </div>
      </section>
    </div>
  );
}

