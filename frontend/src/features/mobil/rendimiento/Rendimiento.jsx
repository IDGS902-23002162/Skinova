import React, { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart2,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
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

// ── Formato de duración para IA (segundos) ─────────────────────────────────────
const formatAiSec = (ms) => (ms ? (ms / 1000).toFixed(2) : "0.00");

// ── Endpoint Row ───────────────────────────────────────────────────────────────
function EndpointRow({ method, path, calls, avgMs, errors, isAi }) {
  const methodColors = { GET: "#2D6658", POST: "#A9C4B5", PUT: "#5a7a71", PATCH: "#8b7e6a", DELETE: "#C98268" };
  return (
    <div className="rend-endpoint-row">
      <div className="rend-ep-main">
        <span className="rend-method" style={{ background: methodColors[method] ?? "#163B35" }}>
          {method}
        </span>
        <span className="rend-path">{path}</span>
      </div>
      <span className="rend-calls">{calls.toLocaleString()} llamadas</span>
      <span className="rend-avg">{isAi ? `${formatAiSec(avgMs)}s` : `${avgMs}ms`} prom.</span>
      <span className={`rend-errors ${errors > 0 ? "has-errors" : ""}`}>
        {errors > 0 ? `${errors} errores` : "✓ OK"}
      </span>
    </div>
  );
}

// ── Skeletons ──────────────────────────────────────────────────────────────────
function SkeletonMetricCard() {
  return (
    <div className="rend-metric-card">
      <div className="rend-metric-top">
        <div className="skel" style={{ width: 22, height: 22, borderRadius: 7 }} />
        <div className="skel" style={{ width: 8, height: 8, borderRadius: "50%" }} />
      </div>
      <div className="skel" style={{ width: "55%", height: 26, margin: "4px 0" }} />
      <div className="skel" style={{ width: "80%", height: 11 }} />
    </div>
  );
}

function SkeletonEndpoints({ rows = 3 }) {
  return (
    <div className="rend-endpoints-table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rend-endpoint-row">
          <div className="rend-ep-main">
            <div className="skel" style={{ width: 52, height: 20, borderRadius: 6 }} />
            <div className="skel" style={{ flex: 1, height: 14 }} />
          </div>
          <div className="skel" style={{ width: 76, height: 12 }} />
          <div className="skel" style={{ width: 64, height: 12 }} />
          <div className="skel" style={{ width: 52, height: 12 }} />
        </div>
      ))}
    </div>
  );
}

// ── Tabla reutilizable de endpoints ────────────────────────────────────────────
function EndpointsTable({ items, loading, skeletonRows = 3, emptyText }) {
  if (loading && !items.length) {
    return <SkeletonEndpoints rows={skeletonRows} />;
  }
  if (!items.length) {
    return <div className="rend-empty">{emptyText}</div>;
  }
  return (
    <div className="rend-endpoints-table">
      <div className="rend-endpoints-header">
        <span>Método</span>
        <span>Ruta</span>
        <span>Volumen</span>
        <span>Prom.</span>
        <span>Estado</span>
      </div>
      {items.map((ep) => (
        <EndpointRow key={`${ep.method}-${ep.path}`} {...ep} />
      ))}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function Rendimiento() {
  const { fetchConAuth } = useApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllEndpoints, setShowAllEndpoints] = useState(false);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetchConAuth("/mobil/performance");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("Error cargando rendimiento:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchConAuth]);

  useEffect(() => {
    loadMetrics();
    const timer = setInterval(loadMetrics, 15000);
    return () => clearInterval(timer);
  }, [loadMetrics]);

  const m = data?.metrics ?? {
    avg_response_ms: 0,
    ai_avg_response_ms: 0,
    requests_today: 0,
    availability: 100,
    errors_detected: 0,
    uptime_pct: 100,
  };
  const endpoints = data?.endpoints ?? [];
  const aiEndpoints = data?.ai_endpoints ?? [];
  const hourly = data?.hourly_requests ?? [];
  const visibleEndpoints = showAllEndpoints ? endpoints : endpoints.slice(0, 5);
  const maxHourly = Math.max(1, ...hourly.map((h) => h.count));

  const showSkeletons = loading && !data;

  return (
    <div className="rend-root">
      <header className="mobil-header">
        <div className="mobil-header-top">
          <div className="mobil-header-tag">
            <Zap size={13} /> Módulo 3 · En vivo
          </div>
          <div className="mobil-header-actions">
            <span className="rend-live-badge" style={{ border: "none", padding: "0 .5rem" }}>
              <span className="rend-live-dot" /> En vivo
            </span>
            <button
              type="button"
              className={`mobil-refresh-btn ${loading ? "is-loading" : ""}`}
              onClick={loadMetrics}
              disabled={loading}
              title="Actualizar ahora"
            >
              <RefreshCw size={14} />
              <span className="mobil-refresh-label">Actualizar</span>
            </button>
          </div>
        </div>
        <h1 className="mobil-title">Rendimiento del Sistema</h1>
        <p className="mobil-subtitle">Tiempos de respuesta, peticiones, IA y disponibilidad</p>
      </header>

      {/* Métricas clave */}
      <div className="rend-metrics-grid">
        {showSkeletons ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonMetricCard key={i} />)
        ) : (
          <>
            <MetricCard icon={Zap} label="Tiempo prom. respuesta" value={m.avg_response_ms} unit="ms" status="ok" color="#2D6658" />
            <MetricCard icon={Sparkles} label="Tiempo de respuesta promedio de IA" value={formatAiSec(m.ai_avg_response_ms)} unit="s" status="ok" color="#163B35" />
            <MetricCard icon={BarChart2} label="Peticiones hoy" value={m.requests_today} unit="" status="ok" color="#A9C4B5" />
            <MetricCard icon={CheckCircle} label="Disponibilidad" value={m.availability} unit="%" status={m.availability < 98 ? "warning" : "ok"} color="#163B35" />
            <MetricCard icon={AlertTriangle} label="Errores detectados" value={m.errors_detected} unit="err" status={m.errors_detected > 0 ? "warning" : "ok"} color="#C98268" />
            <MetricCard icon={Clock} label="Uptime acumulado" value={m.uptime_pct} unit="%" status="ok" color="#2D6658" />
          </>
        )}
      </div>

      {/* Sección exclusiva de Endpoints IA */}
      <section className="rend-section rend-ai-section">
        <div className="rend-section-head">
          <h2 className="rend-section-title rend-ai-title">
            <Sparkles size={17} /> Endpoints de Inteligencia Artificial
          </h2>
          {showSkeletons ? (
            <div className="skel" style={{ width: 220, height: 28, borderRadius: 999 }} />
          ) : (
            <span className="rend-ai-avg-badge">
              Tiempo de respuesta promedio de IA: <strong>{formatAiSec(m.ai_avg_response_ms)} s</strong>
            </span>
          )}
        </div>
        <EndpointsTable
          items={aiEndpoints}
          loading={showSkeletons}
          skeletonRows={3}
          emptyText="Aún no hay peticiones registradas a endpoints de IA."
        />
      </section>

      {/* Endpoints más solicitados */}
      <section className="rend-section">
        <div className="rend-section-head">
          <h2 className="rend-section-title">Endpoints más solicitados</h2>
          {endpoints.length > 5 && (
            <button type="button" className="rend-link-btn" onClick={() => setShowAllEndpoints((v) => !v)}>
              {showAllEndpoints ? "Ver menos" : `Ver todos (${endpoints.length})`} <ArrowRight size={14} />
            </button>
          )}
        </div>
        <EndpointsTable
          items={visibleEndpoints}
          loading={showSkeletons}
          skeletonRows={5}
          emptyText="Aún no hay peticiones registradas."
        />
      </section>

      {/* Gráfica en tiempo real: Peticiones por hora */}
      <section className="rend-section">
        <h2 className="rend-section-title">Peticiones por hora (últimas 12 h)</h2>
        <div className="rend-chart-card">
          {showSkeletons ? (
            <div className="rend-hourly-chart">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rend-hour-col">
                  <div className="skel" style={{ width: 18, height: 10 }} />
                  <div className="rend-hour-track">
                    <div className="skel" style={{ width: "100%", height: `${35 + (i % 4) * 15}%`, borderRadius: "6px 6px 0 0" }} />
                  </div>
                  <div className="skel" style={{ width: 28, height: 10 }} />
                </div>
              ))}
            </div>
          ) : hourly.length === 0 ? (
            <div className="rend-empty">Sin datos horarios aún</div>
          ) : (
            <div className="rend-hourly-chart">
              {hourly.map((slot) => (
                <div key={slot.hour} className="rend-hour-col" title={`${slot.hour}: ${slot.count} peticiones (${slot.errors} errores)`}>
                  <span className="rend-hour-count">{slot.count}</span>
                  <div className="rend-hour-track">
                    <div
                      className="rend-hour-bar"
                      style={{ height: `${Math.max(4, Math.round((slot.count / maxHourly) * 100))}%` }}
                    />
                  </div>
                  <span className="rend-hour-label">{slot.hour}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

