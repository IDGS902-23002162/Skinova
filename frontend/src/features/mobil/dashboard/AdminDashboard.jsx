import React from "react";
import { useUser } from "@clerk/react";
import {
  Users,
  BarChart2,
  ShieldCheck,
  Bell,
  TrendingUp,
  Activity,
} from "lucide-react";
import "./AdminDashboard.css";

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, trend, color }) {
  return (
    <div className="admin-stat-card" style={{ "--accent": color }}>
      <div className="admin-stat-icon">
        <Icon size={22} />
      </div>
      <div className="admin-stat-body">
        <span className="admin-stat-label">{label}</span>
        <span className="admin-stat-value">{value}</span>
        {trend && <span className="admin-stat-trend">{trend}</span>}
      </div>
    </div>
  );
}

// ── Quick Action Button ────────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button className="admin-quick-action" onClick={onClick} type="button">
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}

// ── Main Dashboard (solo contenido, sin sidebar propio) ───────────────────────
export default function AdminDashboard() {
  const { user } = useUser();
  const displayName =
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "Admin";

  return (
    <div className="admin-content-root">
      {/* Header */}
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Panel de Administración</h1>
          <p className="admin-subtitle">
            Bienvenido, <strong>{displayName}</strong>
          </p>
        </div>
        <span className="admin-badge">
          <ShieldCheck size={14} /> Admin
        </span>
      </header>

      {/* Stats Grid */}
      <section className="admin-stats-grid">
        <StatCard
          icon={Users}
          label="Usuarios totales"
          value="1,284"
          trend="↑ 12% este mes"
          color="#2D6658"
        />
        <StatCard
          icon={TrendingUp}
          label="Sesiones activas"
          value="342"
          trend="↑ 5% hoy"
          color="#A9C4B5"
        />
        <StatCard
          icon={Activity}
          label="Rutinas creadas"
          value="8,901"
          trend="↑ 3% esta semana"
          color="#C98268"
        />
        <StatCard
          icon={Bell}
          label="Alertas pendientes"
          value="7"
          trend="2 críticas"
          color="#E8C99A"
        />
      </section>

      {/* Quick Actions */}
      <section className="admin-section">
        <h2 className="admin-section-title">Acciones rápidas</h2>
        <div className="admin-quick-actions">
          <QuickAction icon={Users}    label="Gestionar usuarios" />
          <QuickAction icon={Bell}     label="Enviar notificación" />
          <QuickAction icon={BarChart2} label="Ver reportes" />
          <QuickAction icon={Activity} label="Rendimiento" />
        </div>
      </section>

      {/* Chart placeholder */}
      <section className="admin-section">
        <h2 className="admin-section-title">Actividad reciente</h2>
        <div className="admin-chart-placeholder">
          <BarChart2 size={48} strokeWidth={1} />
          <p>Los gráficos estarán disponibles próximamente.</p>
        </div>
      </section>
    </div>
  );
}
