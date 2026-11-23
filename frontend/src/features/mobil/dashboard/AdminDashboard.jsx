import React, { useState, useEffect, useCallback } from "react";
import { useUser, UserButton } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Activity,
  TrendingUp,
  DollarSign,
  Percent,
  Eye,
  Crown,
  RefreshCw,
  ShieldCheck,
  ArrowUpRight,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
import "./AdminDashboard.css";

// ── Skeleton de carga ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="admin-metric-card skeleton-card">
      <div className="admin-metric-header">
        <div className="skel skel-label" />
        <div className="skel skel-icon" />
      </div>
      <div className="admin-metric-value-wrap">
        <div className="skel skel-value" />
        <div className="skel skel-sub" />
      </div>
      <div className="skel skel-trend" />
    </div>
  );
}

function SkeletonBar() {
  return (
    <div className="admin-module-item">
      <div className="admin-module-info">
        <div className="skel" style={{ width: 22, height: 14, borderRadius: 4 }} />
        <div className="skel" style={{ flex: 1, height: 14, borderRadius: 4, margin: "0 0.5rem" }} />
        <div className="skel" style={{ width: 80, height: 14, borderRadius: 4 }} />
      </div>
      <div className="admin-module-bar-bg">
        <div className="skel" style={{ height: "100%", width: "60%", borderRadius: 999 }} />
      </div>
    </div>
  );
}

function SkeletonChartCol() {
  return (
    <div className="admin-chart-col">
      <div className="skel" style={{ width: 32, height: 12, borderRadius: 4 }} />
      <div className="admin-chart-bar-container">
        <div className="skel" style={{ height: "55%", width: "100%", borderRadius: "8px 8px 0 0" }} />
      </div>
      <div className="skel" style={{ width: 24, height: 12, borderRadius: 4 }} />
      <div className="skel" style={{ width: 36, height: 10, borderRadius: 4 }} />
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, subvalue, trend, trendPositive, color }) {
  return (
    <div className="admin-metric-card" style={{ "--card-accent": color }}>
      <div className="admin-metric-header">
        <span className="admin-metric-label">{label}</span>
        <div className="admin-metric-icon">
          <Icon size={18} />
        </div>
      </div>
      <div className="admin-metric-value-wrap">
        <span className="admin-metric-value">{value}</span>
        {subvalue && <span className="admin-metric-subvalue">{subvalue}</span>}
      </div>
      {trend && (
        <div className={`admin-metric-trend ${trendPositive ? "trend-up" : "trend-neutral"}`}>
          <ArrowUpRight size={14} />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useUser();
  const { fetchConAuth } = useApi();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const displayName =
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Administrador";

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchConAuth("/mobil/dashboard/stats");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("No fue posible sincronizar la analítica en tiempo real.");
    } finally {
      setLoading(false);
    }
  }, [fetchConAuth]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Solo usar datos reales cuando lleguen; nunca mostrar falsos
  const overview = stats?.overview;
  const growth = stats?.growth;
  const mostUsed = stats?.most_used_modules ?? [];
  const revenueHistory = stats?.revenue_history ?? [];
  const maxRevenue = Math.max(...revenueHistory.map((h) => h.revenue), 1);

  const fmtMXN = (n) =>
    typeof n === "number"
      ? n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "—";

  const BAR_COLORS = ["#2D6658", "#3A8A76", "#C98268", "#8B9E94", "#D97706", "#8B5CF6"];

  return (
    <div className="admin-content-root">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="admin-header">
        <div className="admin-header-info">
          <div className="admin-header-pill">
            <ShieldCheck size={14} /> Módulo 1 • Dashboard & Analítica
          </div>
          <h1 className="admin-title">Panel de Control</h1>
          <p className="admin-subtitle">
            Hola, <strong>{displayName}</strong> • Métricas en tiempo real de la PWA
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            className={`admin-refresh-btn ${loading ? "is-loading" : ""}`}
            onClick={loadDashboardData}
            title="Actualizar analítica"
            aria-label="Actualizar datos"
            disabled={loading}
          >
            <RefreshCw size={17} />
          </button>

          <div className="admin-clerk-user-slot">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                variables: {
                  colorPrimary: "#2D6658",
                  colorText: "#163B35",
                  colorBackground: "#F6F3EC",
                  borderRadius: "12px",
                },
                elements: {
                  userButtonAvatarBox: {
                    width: "40px",
                    height: "40px",
                    border: "2px solid #2D6658",
                    boxShadow: "0 2px 8px rgba(45, 102, 88, 0.25)",
                  },
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="admin-alert-banner">
          <span>{error}</span>
          <button onClick={loadDashboardData} className="admin-alert-retry">
            Reintentar
          </button>
        </div>
      )}

      {/* ── Métricas ─────────────────────────────────────────────── */}
      <section className="admin-metrics-grid">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : overview ? (
          <>
            <MetricCard
              icon={Users}
              label="Usuarios Registrados"
              value={overview.registered_users}
              subvalue="en Skinova"
              trend={growth ? `${growth.users} ${growth.period}` : undefined}
              trendPositive
              color="#2D6658"
            />
            <MetricCard
              icon={Activity}
              label="Usuarios Activos (7d)"
              value={overview.active_users}
              subvalue={`~${Math.round((overview.active_users / Math.max(overview.registered_users, 1)) * 100)}% de la base`}
              trend="Sesiones recientes"
              trendPositive
              color="#3A8A76"
            />
            <MetricCard
              icon={Eye}
              label="Visitas a la PWA"
              value={overview.visits_month.toLocaleString()}
              subvalue={`/ ${overview.total_visits.toLocaleString()} históricas`}
              trend={growth ? `${growth.visits} este mes` : undefined}
              trendPositive
              color="#D97706"
            />
            <MetricCard
              icon={DollarSign}
              label="Ingresos del Mes"
              value={`$${fmtMXN(overview.monthly_revenue)}`}
              subvalue={overview.currency}
              trend={growth ? `${growth.revenue} vs. mes anterior` : undefined}
              trendPositive
              color="#15803D"
            />
            <MetricCard
              icon={Percent}
              label="Tasa de Conversión"
              value={`${overview.conversion_rate}%`}
              subvalue="Visitante → suscriptor"
              trend={overview.conversion_rate > 0 ? "Clientes de pago" : "Sin suscripciones aún"}
              trendPositive={overview.conversion_rate > 0}
              color="#8B5CF6"
            />
            <MetricCard
              icon={Crown}
              label="Suscripciones Activas"
              value={overview.active_subscriptions}
              subvalue="Skinova Premium · $99 MXN"
              trend="Clientes de pago"
              trendPositive
              color="#C98268"
            />
          </>
        ) : null}
      </section>

      {/* ── Módulos y Gráfico ─────────────────────────────────────── */}
      {!error && (
        <div className="admin-analytics-split">
          {/* Módulos más utilizados */}
          <section className="admin-card admin-modules-card">
            <div className="admin-card-header">
              <div className="admin-card-title-group">
                <Layers size={18} className="admin-card-icon" />
                <div>
                  <h2 className="admin-card-title">Módulos Más Utilizados</h2>
                  <p className="admin-card-subtitle">
                    Frecuencia de visitas registradas en la PWA
                  </p>
                </div>
              </div>
              <span className="admin-card-tag">Ranking PWA</span>
            </div>

            <div className="admin-modules-list">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonBar key={i} />)
                : mostUsed.length > 0
                  ? mostUsed.map((mod, index) => (
                    <div key={mod.id} className="admin-module-item">
                      <div className="admin-module-info">
                        <span className="admin-module-rank">#{index + 1}</span>
                        <span className="admin-module-name">{mod.label}</span>
                        <span className="admin-module-stats">
                          <strong>{mod.visits.toLocaleString()}</strong> visitas ({mod.percentage}%)
                        </span>
                      </div>
                      <div className="admin-module-bar-bg">
                        <div
                          className="admin-module-bar-fill"
                          style={{
                            width: `${Math.min(mod.percentage * 2.8, 100)}%`,
                            backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))
                  : (
                    <p className="admin-empty-note">
                      Sin visitas registradas aún. Se acumularán automáticamente al navegar por la PWA.
                    </p>
                  )}
            </div>
          </section>

          {/* Histórico de ingresos */}
          <section className="admin-card admin-revenue-card">
            <div className="admin-card-header">
              <div className="admin-card-title-group">
                <TrendingUp size={18} className="admin-card-icon" />
                <div>
                  <h2 className="admin-card-title">Crecimiento de Ingresos</h2>
                  <p className="admin-card-subtitle">
                    Histórico mensual de suscripciones ($ MXN)
                  </p>
                </div>
              </div>
              {growth && (
                <div className="admin-revenue-badge">
                  <Sparkles size={13} /> {growth.revenue}
                </div>
              )}
            </div>

            <div className="admin-chart-bars-wrap">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonChartCol key={i} />)
                : revenueHistory.length > 0
                  ? revenueHistory.map((item) => {
                    const heightPercent = Math.round((item.revenue / maxRevenue) * 100);
                    return (
                      <div key={item.month} className="admin-chart-col">
                        <span className="admin-chart-col-val">
                          {item.revenue > 0 ? `$${item.revenue}` : "—"}
                        </span>
                        <div className="admin-chart-bar-container">
                          <div
                            className="admin-chart-bar-fill"
                            style={{ height: `${heightPercent || 2}%` }}
                          />
                        </div>
                        <span className="admin-chart-col-label">{item.month}</span>
                        <span className="admin-chart-col-sub">{item.subscribers} subs</span>
                      </div>
                    );
                  })
                  : (
                    <p className="admin-empty-note">Sin historial de ingresos aún.</p>
                  )}
            </div>

            {overview && (
              <div className="admin-revenue-footer">
                <div className="admin-revenue-kpi">
                  <span className="kpi-label">Ingreso actual</span>
                  <span className="kpi-value">${fmtMXN(overview.monthly_revenue)} MXN</span>
                </div>
                <div className="admin-revenue-kpi">
                  <span className="kpi-label">Suscriptores activos</span>
                  <span className="kpi-value">{overview.active_subscriptions}</span>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Acceso Rápido → Módulo 2 ─────────────────────────────── */}
      <section className="admin-quick-banner" onClick={() => navigate("/admin/usuarios")}>
        <div className="admin-quick-banner-content">
          <div className="admin-quick-banner-icon">
            <Crown size={24} />
          </div>
          <div>
            <h3 className="admin-quick-banner-title">Módulo 2: Usuarios y Suscripciones</h3>
            <p className="admin-quick-banner-desc">
              Consulta de usuarios, estado de cuentas, IPs, vencimientos y modificación de planes.
            </p>
          </div>
        </div>
        <div className="admin-quick-banner-action">
          <span>Gestionar</span>
          <ChevronRight size={18} />
        </div>
      </section>
    </div>
  );
}
