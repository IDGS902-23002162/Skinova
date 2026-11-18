import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Crown,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  X,
  AlertCircle,
  Check,
  UserX,
  UserCheck,
} from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
import "./GestionUsuarios.css";

// ── Mini Stat Card ─────────────────────────────────────────────────────────────
function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div className="gu-mini-stat" style={{ "--accent": color }}>
      <div className="gu-mini-icon">
        <Icon size={18} />
      </div>
      <div className="gu-mini-body">
        <span className="gu-mini-val">{value}</span>
        <span className="gu-mini-label">{label}</span>
      </div>
    </div>
  );
}

// ── Badge de Estado ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    activo: { label: "Activo", cls: "badge-activo", icon: CheckCircle },
    cancelado: { label: "Cancelado", cls: "badge-cancelado", icon: XCircle },
    vencido: { label: "Vencido", cls: "badge-vencido", icon: Clock },
    suspendido: { label: "Suspendido", cls: "badge-suspendido", icon: ShieldAlert },
  };
  const { label, cls, icon: Icon } = map[status] ?? map.activo;
  return (
    <span className={`gu-badge ${cls}`}>
      <Icon size={12} /> {label}
    </span>
  );
}

// ── Modal de Administración de Suscripción y Cuenta ───────────────────────────
function ManageUserModal({ user, onClose, onSaveSubscription, onToggleBan, updating }) {
  const [selectedPlan, setSelectedPlan] = useState(user.subscription?.plan || "Gratuito");
  const [selectedStatus, setSelectedStatus] = useState(user.subscription?.status || "activo");
  const [confirmBan, setConfirmBan] = useState(false);

  const isBanned = user.banned || user.account_status === "suspendido";

  const handleSave = () => {
    onSaveSubscription(user.id, selectedPlan, selectedStatus);
  };

  return (
    <div className="gu-modal-overlay" onClick={onClose}>
      <div className="gu-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="gu-modal-header">
          <div className="gu-modal-header-user">
            <div className="gu-user-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                user.name?.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="gu-modal-title">{user.name}</h3>
              <p className="gu-modal-email">{user.email}</p>
            </div>
          </div>
          <button className="gu-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="gu-modal-body">
          {/* Info rápida */}
          <div className="gu-modal-quickinfo">
            <div className="gu-modal-info-item">
              <Clock size={14} /> Último acceso: <strong>{user.last_access}</strong>
            </div>
          </div>

          {/* Selector de Plan */}
          <div className="gu-modal-field">
            <label className="gu-modal-label">Plan Contratado</label>
            <div className="gu-plan-selector">
              <button
                type="button"
                className={`gu-plan-option ${selectedPlan === "Gratuito" ? "active" : ""}`}
                onClick={() => setSelectedPlan("Gratuito")}
              >
                <div className="gu-plan-opt-header">
                  <span className="gu-plan-name">Gratuito</span>
                  {selectedPlan === "Gratuito" && <Check size={16} />}
                </div>
                <span className="gu-plan-desc">$0 MXN / mes • Acceso básico</span>
              </button>

              <button
                type="button"
                className={`gu-plan-option ${selectedPlan === "Premium" ? "active" : ""}`}
                onClick={() => setSelectedPlan("Premium")}
              >
                <div className="gu-plan-opt-header">
                  <span className="gu-plan-name">
                    <Crown size={14} className="crown-icon" /> Skinova Premium
                  </span>
                  {selectedPlan === "Premium" && <Check size={16} />}
                </div>
                <span className="gu-plan-desc">$199 MXN / mes • IA ilimitada</span>
              </button>
            </div>
          </div>

          {/* Selector de Estado de Suscripción */}
          <div className="gu-modal-field">
            <label className="gu-modal-label">Estado de la Suscripción</label>
            <div className="gu-status-selector">
              {["activo", "cancelado", "vencido"].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`gu-status-opt ${selectedStatus === st ? "active " + st : ""}`}
                  onClick={() => setSelectedStatus(st)}
                >
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Fechas */}
          <div className="gu-modal-dates">
            <div>
              <span className="gu-date-label">Fecha de Inicio:</span>
              <span className="gu-date-val">{user.subscription?.start_date || "N/A"}</span>
            </div>
            <div>
              <span className="gu-date-label">Vencimiento / Renovación:</span>
              <span className="gu-date-val">{user.subscription?.end_date || "N/A"}</span>
            </div>
          </div>

          {/* Zona de Estado de Cuenta / Suspensión */}
          <div className="gu-modal-danger-zone">
            <div className="gu-danger-info">
              {isBanned ? (
                <>
                  <ShieldAlert size={18} className="danger-icon" />
                  <div>
                    <strong>Cuenta actualmente suspendida</strong>
                    <p>El usuario no puede iniciar sesión ni realizar peticiones.</p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} className="safe-icon" />
                  <div>
                    <strong>Estado de Cuenta: Habilitada</strong>
                    <p>El usuario tiene acceso normal a la plataforma.</p>
                  </div>
                </>
              )}
            </div>

            {confirmBan ? (
              <div className="gu-ban-confirm">
                <span>¿Confirmar {isBanned ? "reactivación" : "suspensión"}?</span>
                <button
                  type="button"
                  className={`gu-btn-confirm ${isBanned ? "btn-unban" : "btn-ban"}`}
                  onClick={() => {
                    setConfirmBan(false);
                    onToggleBan(user.id);
                  }}
                  disabled={updating}
                >
                  Sí, {isBanned ? "reactivar" : "suspender"}
                </button>
                <button
                  type="button"
                  className="gu-btn-cancel"
                  onClick={() => setConfirmBan(false)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`gu-btn-toggle-ban ${isBanned ? "unban" : "ban"}`}
                onClick={() => setConfirmBan(true)}
                disabled={updating}
              >
                {isBanned ? (
                  <>
                    <UserCheck size={16} /> Reactivar Usuario
                  </>
                ) : (
                  <>
                    <UserX size={16} /> Suspender Usuario
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="gu-modal-footer">
          <button type="button" className="gu-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="gu-btn-primary"
            onClick={handleSave}
            disabled={updating}
          >
            {updating ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal de Gestión de Usuarios ────────────────────────────────
export default function GestionUsuarios() {
  const { fetchConAuth } = useApi();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    active_subscriptions: 0,
    cancelled_subscriptions: 0,
    expired_subscriptions: 0,
    new_this_month: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState(null);

  // Carga única de todos los usuarios desde el backend
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchConAuth("/mobil/users");
      if (!res.ok) throw new Error("Error al obtener usuarios");
      const data = await res.json();
      setUsers(data.users || []);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      showNotice("No se pudo conectar con la API de usuarios", "error");
    } finally {
      setLoading(false);
    }
  }, [fetchConAuth]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filtrado instantáneo en el cliente (0 ms de delay, sin llamadas extra al backend)
  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return users.filter((u) => {
      const planName = u.subscription?.plan || "Gratuito";
      const accountStatus = u.account_status || "activo";

      const matchesQ =
        !q ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        planName.toLowerCase().includes(q);

      const matchesStatus =
        filterStatus === "all" || accountStatus.toLowerCase() === filterStatus.toLowerCase();

      const matchesPlan =
        filterPlan === "all" || planName.toLowerCase() === filterPlan.toLowerCase();

      return matchesQ && matchesStatus && matchesPlan;
    });
  }, [users, searchTerm, filterStatus, filterPlan]);

  const showNotice = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Modificar suscripción
  const handleSaveSubscription = async (userId, plan, status) => {
    try {
      setUpdating(true);
      const res = await fetchConAuth(`/mobil/users/${userId}/subscription`, {
        method: "PATCH",
        body: JSON.stringify({ plan, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar suscripción");

      showNotice("Suscripción actualizada exitosamente");
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      console.error("Error updating sub:", err);
      showNotice(err.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  // Suspender / Reactivar usuario
  const handleToggleBan = async (userId) => {
    try {
      setUpdating(true);
      const res = await fetchConAuth(`/mobil/users/${userId}/toggle-status`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al alternar estado");

      showNotice(data.message || "Estado de usuario modificado");
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      console.error("Error toggle ban:", err);
      showNotice(err.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="gu-root">
      {/* Toast Notification */}
      {notification && (
        <div className={`gu-toast ${notification.type}`}>
          {notification.type === "error" ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header */}
      <header className="gu-header">
        <div>
          <div className="gu-header-tag">
            <Users size={14} /> Módulo 2
          </div>
          <h1 className="gu-title">Usuarios y Suscripciones</h1>
          <p className="gu-subtitle">
            Consultar estado de cuenta, último acceso y administración de suscripciones.
          </p>
        </div>

        <button
          className={`gu-refresh-btn ${loading ? "is-loading" : ""}`}
          onClick={loadUsers}
          disabled={loading}
          title="Actualizar lista"
        >
          <RefreshCw size={17} />
        </button>
      </header>

      {/* Mini stats */}
      <div className="gu-stats-row">
        <MiniStat
          icon={Users}
          label="Total usuarios"
          value={stats.total_users || users.length}
          color="#2D6658"
        />
        <MiniStat
          icon={Crown}
          label="Suscripciones activas"
          value={stats.active_subscriptions}
          color="#3A8A76"
        />
        <MiniStat
          icon={XCircle}
          label="Canceladas"
          value={stats.cancelled_subscriptions}
          color="#C98268"
        />
        <MiniStat
          icon={Clock}
          label="Vencidas"
          value={stats.expired_subscriptions}
          color="#D97706"
        />
        <MiniStat
          icon={TrendingUp}
          label="Nuevos este mes"
          value={`+${stats.new_this_month}`}
          color="#163B35"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="gu-toolbar">
        <div className="gu-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, email, plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="gu-search-clear" onClick={() => setSearchTerm("")}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Chips de filtro rápido */}
        <div className="gu-filter-chips">
          <button
            className={`gu-chip ${filterStatus === "all" && filterPlan === "all" ? "active" : ""}`}
            onClick={() => {
              setFilterStatus("all");
              setFilterPlan("all");
            }}
          >
            Todos
          </button>
          <button
            className={`gu-chip ${filterStatus === "activo" ? "active" : ""}`}
            onClick={() => {
              setFilterStatus("activo");
              setFilterPlan("all");
            }}
          >
            Activos
          </button>
          <button
            className={`gu-chip ${filterPlan === "premium" ? "active" : ""}`}
            onClick={() => {
              setFilterPlan("premium");
              setFilterStatus("all");
            }}
          >
            <Crown size={12} /> Premium
          </button>
          <button
            className={`gu-chip ${filterPlan === "gratuito" ? "active" : ""}`}
            onClick={() => {
              setFilterPlan("gratuito");
              setFilterStatus("all");
            }}
          >
            Gratuito
          </button>
          <button
            className={`gu-chip ${filterStatus === "cancelado" ? "active" : ""}`}
            onClick={() => {
              setFilterStatus("cancelado");
              setFilterPlan("all");
            }}
          >
            Cancelados
          </button>
          <button
            className={`gu-chip ${filterStatus === "vencido" ? "active" : ""}`}
            onClick={() => {
              setFilterStatus("vencido");
              setFilterPlan("all");
            }}
          >
            Vencidos
          </button>
          <button
            className={`gu-chip ${filterStatus === "suspendido" ? "active" : ""}`}
            onClick={() => {
              setFilterStatus("suspendido");
              setFilterPlan("all");
            }}
          >
            Suspendidos
          </button>
        </div>
      </div>

      {/* Users Count Info */}
      <div className="gu-list-header-info">
        <span>Mostrando {filteredUsers.length} usuarios</span>
      </div>

      {/* Users List */}
      {loading && users.length === 0 ? (
        <div className="gu-empty-state">
          <RefreshCw size={28} className="spin" />
          <p>Cargando lista de usuarios...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="gu-empty-state">
          <Users size={36} />
          <p>No se encontraron usuarios con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="gu-users-grid">
          {filteredUsers.map((u) => {
            const isPremium = u.subscription?.plan === "Premium";
            const isSuspended = u.banned || u.account_status === "suspendido";

            return (
              <div key={u.id} className={`gu-user-card ${isSuspended ? "is-suspended" : ""}`}>
                {/* Cabecera usuario */}
                <div className="gu-user-top">
                  <div className="gu-user-main">
                    <div className="gu-user-avatar">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} />
                      ) : (
                        u.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="gu-user-identifiers">
                      <div className="gu-user-name-row">
                        <span className="gu-user-name">{u.name}</span>
                        {isSuspended && (
                          <span className="gu-suspended-pill">
                            <ShieldAlert size={11} /> Suspendido
                          </span>
                        )}
                      </div>
                      <span className="gu-user-email">{u.email}</span>
                    </div>
                  </div>

                  {/* Botón Administrar */}
                  <button
                    className="gu-admin-action-btn"
                    onClick={() => setSelectedUser(u)}
                    title="Administrar suscripción y cuenta"
                  >
                    <Edit3 size={15} />
                    <span>Administrar</span>
                  </button>
                </div>

                {/* Badges de Plan y Estado de Suscripción */}
                <div className="gu-user-badges-row">
                  <span className={`gu-plan-badge ${isPremium ? "badge-premium" : "badge-free"}`}>
                    <Crown size={13} /> {u.subscription?.plan || "Gratuito"}
                  </span>
                  <StatusBadge status={u.subscription?.status || "activo"} />
                  {u.skin_type && u.skin_type !== "No registrado" && (
                    <span className="gu-skintype-badge">Piel {u.skin_type}</span>
                  )}
                </div>

                {/* Detalles requeridos: último acceso, inicio/vencimiento */}
                <div className="gu-user-meta-grid">
                  <div className="gu-meta-item">
                    <span className="gu-meta-lbl">
                      <Clock size={13} /> Último Acceso
                    </span>
                    <span className="gu-meta-val" title={u.last_access_date}>
                      {u.last_access}
                    </span>
                  </div>

                  <div className="gu-meta-item">
                    <span className="gu-meta-lbl">
                      <Calendar size={13} /> Fecha Inicio
                    </span>
                    <span className="gu-meta-val">{u.subscription?.start_date || u.created_at}</span>
                  </div>

                  <div className="gu-meta-item">
                    <span className="gu-meta-lbl">
                      <Calendar size={13} /> Vencimiento
                    </span>
                    <span className="gu-meta-val">
                      {u.subscription?.end_date || "Permanente"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Administración */}
      {selectedUser && (
        <ManageUserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSaveSubscription={handleSaveSubscription}
          onToggleBan={handleToggleBan}
          updating={updating}
        />
      )}
    </div>
  );
}