import React from "react";
import {
  Users,
  Crown,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import "./GestionUsuarios.css";

// ── Stat Mini ──────────────────────────────────────────────────────────────────
function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div className="gu-mini-stat" style={{ "--accent": color }}>
      <Icon size={18} />
      <div>
        <span className="gu-mini-val">{value}</span>
        <span className="gu-mini-label">{label}</span>
      </div>
    </div>
  );
}

// ── Badge de estado ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    activo: { label: "Activo", cls: "badge-activo", icon: CheckCircle },
    cancelado: { label: "Cancelado", cls: "badge-cancelado", icon: XCircle },
    vencido: { label: "Vencido", cls: "badge-vencido", icon: Clock },
  };
  const { label, cls, icon: Icon } = map[status] ?? map.vencido;
  return (
    <span className={`gu-badge ${cls}`}>
      <Icon size={12} /> {label}
    </span>
  );
}

// ── Fila de usuario ────────────────────────────────────────────────────────────
function UserRow({ name, email, plan, status, lastAccess, joined }) {
  return (
    <div className="gu-user-row">
      <div className="gu-user-avatar">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="gu-user-info">
        <span className="gu-user-name">{name}</span>
        <span className="gu-user-email">{email}</span>
      </div>
      <div className="gu-user-meta">
        <span className="gu-user-plan">
          <Crown size={12} /> {plan}
        </span>
        <StatusBadge status={status} />
      </div>
      <div className="gu-user-dates">
        <span>Último acceso: <strong>{lastAccess}</strong></span>
        <span>Desde: <strong>{joined}</strong></span>
      </div>
      <button className="gu-user-action" aria-label="Opciones">
        <MoreVertical size={16} />
      </button>
    </div>
  );
}

// ── Datos demo ─────────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { name: "Ana García",    email: "ana@example.com",    plan: "Premium",  status: "activo",    lastAccess: "hace 2h",   joined: "Ene 2026" },
  { name: "Carlos Ruiz",   email: "carlos@example.com", plan: "Gratuito", status: "activo",    lastAccess: "hace 1d",   joined: "Mar 2026" },
  { name: "Laura Méndez",  email: "laura@example.com",  plan: "Premium",  status: "vencido",   lastAccess: "hace 5d",   joined: "Feb 2025" },
  { name: "Pedro Torres",  email: "pedro@example.com",  plan: "Gratuito", status: "cancelado", lastAccess: "hace 12d",  joined: "Nov 2025" },
  { name: "Sofia Leal",    email: "sofia@example.com",  plan: "Premium",  status: "activo",    lastAccess: "hace 30m",  joined: "Abr 2026" },
];

// ── Componente principal ───────────────────────────────────────────────────────
export default function GestionUsuarios() {
  return (
    <div className="gu-root">
      <header className="gu-header">
        <div>
          <h1 className="gu-title">Usuarios y Suscripciones</h1>
          <p className="gu-subtitle">Estado de cuentas, planes y actividad reciente</p>
        </div>
      </header>

      {/* Mini stats */}
      <div className="gu-stats-row">
        <MiniStat icon={Users}      label="Total usuarios"       value="1,284"  color="#2D6658" />
        <MiniStat icon={Crown}      label="Suscripciones activas" value="438"   color="#A9C4B5" />
        <MiniStat icon={XCircle}    label="Canceladas"           value="62"     color="#C98268" />
        <MiniStat icon={TrendingUp} label="Nuevos este mes"      value="+94"    color="#163B35" />
      </div>

      {/* Search & filter bar */}
      <div className="gu-toolbar">
        <div className="gu-search">
          <Search size={16} />
          <input placeholder="Buscar por nombre, email o plan…" />
        </div>
        <button className="gu-filter-btn">
          <Filter size={16} /> Filtrar
        </button>
      </div>

      {/* Table header */}
      <div className="gu-table-header">
        <span>Usuario</span>
        <span>Plan / Estado</span>
        <span>Acceso</span>
        <span></span>
      </div>

      {/* Rows */}
      <div className="gu-users-list">
        {DEMO_USERS.map((u) => (
          <UserRow key={u.email} {...u} />
        ))}
      </div>

      {/* Pagination placeholder */}
      <div className="gu-pagination">
        <button className="gu-page-btn" disabled>← Anterior</button>
        <span className="gu-page-info">Página 1 de 14</span>
        <button className="gu-page-btn">Siguiente →</button>
      </div>
    </div>
  );
}

