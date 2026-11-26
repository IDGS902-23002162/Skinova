import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Bell,
  CreditCard,
  Send,
  ChevronRight,
  Save,
  X,
  RefreshCw,
} from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
import "./Administracion.css";

// ── Toggle Switch (Apple HIG pill switch) ──────────────────────────────────────
function Toggle({ label, description, value, onToggle, disabled }) {
  return (
    <div
      className={`adm-toggle-row ${disabled ? "disabled" : ""}`}
      role="switch"
      aria-checked={Boolean(value)}
      tabIndex={0}
      onClick={() => !disabled && onToggle()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="adm-toggle-info">
        <span className="adm-toggle-label">{label}</span>
        {description && <span className="adm-toggle-desc">{description}</span>}
      </div>
      <span className={`adm-ios-switch ${value ? "on" : "off"}`}>
        <span className="adm-ios-thumb" />
      </span>
    </div>
  );
}

// ── Section Card ───────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="adm-section-card">
      <div className="adm-section-head">
        <span className="adm-section-icon"><Icon size={18} /></span>
        <h2 className="adm-section-title">{title}</h2>
      </div>
      <div className="adm-section-body">{children}</div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function Administracion() {
  const { fetchConAuth } = useApi();
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState({
    consulta_ia: true,
    comunidad: true,
    directorio: true,
    maintenance_mode: false,
    registration_enabled: true,
  });
  const [editingIdx, setEditingIdx] = useState(null);
  const [draftPlan, setDraftPlan] = useState({ code: "", name: "", price: 0, features: "" });
  const [notifMsg, setNotifMsg] = useState("");
  const [segment, setSegment] = useState("all");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  const showToast = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 3000);
  };

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchConAuth("/mobil/admin/config");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
        if (data.features) setFeatures(data.features);
      }
    } catch (err) {
      console.error("Error cargando administración:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchConAuth]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveConfig = async (payload, toastMsg) => {
    try {
      const res = await fetchConAuth("/mobil/admin/config", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
        if (data.features) setFeatures(data.features);
        if (toastMsg) showToast(toastMsg);
      }
    } catch (err) {
      console.error("Error guardando configuración:", err);
    }
  };

  const handleToggle = (key) => {
    const next = { ...features, [key]: !features[key] };
    setFeatures(next);
    saveConfig({ features: next }, "Función actualizada");
  };

  const startEditPlan = (idx) => {
    setEditingIdx(idx);
    setDraftPlan({ ...plans[idx] });
  };

  const startNewPlan = () => {
    setEditingIdx("new");
    setDraftPlan({ code: `plan_${Date.now()}`, name: "", price: 99, features: "" });
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!draftPlan.name.trim()) return;
    const normalized = { ...draftPlan, price: Number(draftPlan.price) || 0 };
    const nextPlans =
      editingIdx === "new"
        ? [...plans, normalized]
        : plans.map((p, i) => (i === editingIdx ? normalized : p));
    setEditingIdx(null);
    await saveConfig({ plans: nextPlans }, "Plan guardado correctamente");
  };

  const handleSendNotif = async () => {
    if (!notifMsg.trim()) return;
    setSendingNotif(true);
    try {
      const res = await fetchConAuth("/mobil/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({ message: notifMsg.trim(), segment }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifMsg("");
        showToast(`Notificación enviada a ${data.sent_count} usuarios`);
      }
    } catch (err) {
      console.error("Error enviando notificación:", err);
    } finally {
      setSendingNotif(false);
    }
  };

  const showSkeletons = loading && plans.length === 0;

  return (
    <div className="adm-root">
      <header className="mobil-header">
        <div className="mobil-header-top">
          <div className="mobil-header-tag">
            <Settings size={13} /> Módulo 5 · Configuración
          </div>
          <div className="mobil-header-actions">
            {feedback && <span className="adm-toast">{feedback}</span>}
            <button
              type="button"
              className={`mobil-refresh-btn ${loading ? "is-loading" : ""}`}
              onClick={loadConfig}
              disabled={loading}
              title="Actualizar configuración"
            >
              <RefreshCw size={14} />
              <span className="mobil-refresh-label">Actualizar</span>
            </button>
          </div>
        </div>
        <h1 className="mobil-title">Administración</h1>
        <p className="mobil-subtitle">Configuración global, precios y notificaciones</p>
      </header>

      <div className="adm-grid">
        {/* Planes y precios */}
        <SectionCard icon={CreditCard} title="Planes de suscripción">
          {showSkeletons ? (
            <>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="adm-plan-row">
                  <div className="adm-plan-info" style={{ flex: 1, gap: 6 }}>
                    <div className="skel" style={{ width: "40%", height: 14 }} />
                    <div className="skel" style={{ width: "75%", height: 11 }} />
                  </div>
                  <div className="skel" style={{ width: 90, height: 28, borderRadius: 8 }} />
                </div>
              ))}
              <div className="skel" style={{ width: "100%", height: 38, borderRadius: 10 }} />
            </>
          ) : (
            plans.map((plan, idx) =>
            editingIdx === idx ? (
              <form key={plan.code || idx} className="adm-plan-editor" onSubmit={handleSavePlan}>
                <div className="adm-editor-row">
                  <input
                    className="adm-input"
                    value={draftPlan.name}
                    onChange={(e) => setDraftPlan({ ...draftPlan, name: e.target.value })}
                    placeholder="Nombre del plan"
                    required
                  />
                  <input
                    className="adm-input adm-price-input"
                    type="number"
                    min="0"
                    value={draftPlan.price}
                    onChange={(e) => setDraftPlan({ ...draftPlan, price: e.target.value })}
                    placeholder="Precio MXN"
                    required
                  />
                </div>
                <input
                  className="adm-input"
                  value={draftPlan.features}
                  onChange={(e) => setDraftPlan({ ...draftPlan, features: e.target.value })}
                  placeholder="Características"
                />
                <div className="adm-editor-actions">
                  <button type="button" className="adm-plan-edit" onClick={() => setEditingIdx(null)}>
                    <X size={14} /> Cancelar
                  </button>
                  <button type="submit" className="adm-save-btn">
                    <Save size={14} /> Guardar
                  </button>
                </div>
              </form>
            ) : (
              <div key={plan.code || idx} className="adm-plan-row">
                <div className="adm-plan-info">
                  <span className="adm-plan-name">{plan.name}</span>
                  <span className="adm-plan-features">{plan.features}</span>
                </div>
                <div className="adm-plan-right">
                  <span className="adm-plan-price">
                    {Number(plan.price) === 0 ? "$0 / mes" : `$${plan.price} MXN / mes`}
                  </span>
                  <button type="button" className="adm-plan-edit" onClick={() => startEditPlan(idx)}>
                    Editar <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )
          ))}

          {!showSkeletons && (
            editingIdx === "new" ? (
            <form className="adm-plan-editor" onSubmit={handleSavePlan}>
              <div className="adm-editor-row">
                <input
                  className="adm-input"
                  value={draftPlan.name}
                  onChange={(e) => setDraftPlan({ ...draftPlan, name: e.target.value })}
                  placeholder="Nombre del nuevo plan"
                  required
                />
                <input
                  className="adm-input adm-price-input"
                  type="number"
                  min="0"
                  value={draftPlan.price}
                  onChange={(e) => setDraftPlan({ ...draftPlan, price: e.target.value })}
                  placeholder="MXN"
                  required
                />
              </div>
              <input
                className="adm-input"
                value={draftPlan.features}
                onChange={(e) => setDraftPlan({ ...draftPlan, features: e.target.value })}
                placeholder="Características separadas por ·"
              />
              <div className="adm-editor-actions">
                <button type="button" className="adm-plan-edit" onClick={() => setEditingIdx(null)}>
                  <X size={14} /> Cancelar
                </button>
                <button type="submit" className="adm-save-btn">
                  <Save size={14} /> Crear plan
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="adm-add-plan-btn" onClick={startNewPlan}>
              + Agregar nuevo plan
            </button>
          ))}
        </SectionCard>

        {/* Notificaciones masivas */}
        <SectionCard icon={Bell} title="Enviar notificación a usuarios">
          <div className="adm-notif-form">
            <label className="adm-label">Mensaje</label>
            <textarea
              className="adm-textarea"
              rows={3}
              placeholder="Escribe el mensaje que recibirán los usuarios seleccionados…"
              value={notifMsg}
              onChange={(e) => setNotifMsg(e.target.value)}
            />
            <div className="adm-notif-actions">
              <select className="adm-select" value={segment} onChange={(e) => setSegment(e.target.value)}>
                <option value="all">Todos los usuarios</option>
                <option value="premium">Solo Premium</option>
                <option value="free">Solo Gratuitos</option>
              </select>
              <button
                type="button"
                className="adm-send-btn"
                disabled={!notifMsg.trim() || sendingNotif}
                onClick={handleSendNotif}
              >
                <Send size={15} /> {sendingNotif ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Funciones toggle */}
        <SectionCard icon={Settings} title="Activar / desactivar funciones">
          {showSkeletons ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="adm-toggle-row" style={{ pointerEvents: "none" }}>
                <div className="adm-toggle-info" style={{ flex: 1, gap: 6 }}>
                  <div className="skel" style={{ width: "45%", height: 14 }} />
                  <div className="skel" style={{ width: "70%", height: 10 }} />
                </div>
                <div className="skel" style={{ width: 32, height: 20, borderRadius: 999 }} />
              </div>
            ))
          ) : (
            <>
              <Toggle
                label="Consulta IA"
                description="Habilita el módulo de consulta con Gemini"
                value={features.consulta_ia}
                onToggle={() => handleToggle("consulta_ia")}
              />
              <Toggle
                label="Comunidad / Foro"
                description="Permite a usuarios publicar en el foro"
                value={features.comunidad}
                onToggle={() => handleToggle("comunidad")}
              />
              <Toggle
                label="Directorio de dermats"
                description="Muestra el directorio de dermatólogos"
                value={features.directorio}
                onToggle={() => handleToggle("directorio")}
              />
              <Toggle
                label="Modo mantenimiento"
                description="Muestra pantalla de mantenimiento a los usuarios"
                value={features.maintenance_mode}
                onToggle={() => handleToggle("maintenance_mode")}
              />
              <Toggle
                label="Registro de nuevos"
                description="Permite que nuevos usuarios se registren"
                value={features.registration_enabled}
                onToggle={() => handleToggle("registration_enabled")}
              />
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

