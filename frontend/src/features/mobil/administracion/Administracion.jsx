import React, { useState } from "react";
import {
  Settings,
  Bell,
  CreditCard,
  ToggleLeft,
  ToggleRight,
  Send,
  ChevronRight,
  Save,
} from "lucide-react";
import "./Administracion.css";

// ── Toggle Switch ──────────────────────────────────────────────────────────────
function Toggle({ label, description, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="adm-toggle-row" onClick={() => setOn((p) => !p)}>
      <div className="adm-toggle-info">
        <span className="adm-toggle-label">{label}</span>
        {description && <span className="adm-toggle-desc">{description}</span>}
      </div>
      <span className={`adm-toggle-switch ${on ? "on" : "off"}`}>
        {on ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
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

// ── Plan Row ───────────────────────────────────────────────────────────────────
function PlanRow({ name, price, features }) {
  return (
    <div className="adm-plan-row">
      <div className="adm-plan-info">
        <span className="adm-plan-name">{name}</span>
        <span className="adm-plan-features">{features}</span>
      </div>
      <div className="adm-plan-right">
        <span className="adm-plan-price">{price}</span>
        <button className="adm-plan-edit">
          Editar <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function Administracion() {
  const [notifMsg, setNotifMsg] = useState("");

  return (
    <div className="adm-root">
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Administración</h1>
          <p className="adm-subtitle">Configuración global, precios y notificaciones</p>
        </div>
      </header>

      <div className="adm-grid">
        {/* Planes y precios */}
        <SectionCard icon={CreditCard} title="Planes de suscripción">
          <PlanRow
            name="Gratuito"
            price="$0 / mes"
            features="Consulta IA limitada · Rutinas básicas · Sin Neceser"
          />
          <PlanRow
            name="Premium"
            price="$149 MXN / mes"
            features="Consulta IA ilimitada · Todas las funciones · Prioridad"
          />
          <button className="adm-add-plan-btn">+ Agregar nuevo plan</button>
        </SectionCard>

        {/* Notificaciones masivas */}
        <SectionCard icon={Bell} title="Enviar notificación a usuarios">
          <div className="adm-notif-form">
            <label className="adm-label">Mensaje</label>
            <textarea
              className="adm-textarea"
              rows={3}
              placeholder="Escribe el mensaje que recibirán todos los usuarios activos…"
              value={notifMsg}
              onChange={(e) => setNotifMsg(e.target.value)}
            />
            <div className="adm-notif-actions">
              <select className="adm-select">
                <option>Todos los usuarios</option>
                <option>Solo Premium</option>
                <option>Solo Gratuitos</option>
              </select>
              <button className="adm-send-btn" disabled={!notifMsg.trim()}>
                <Send size={15} /> Enviar
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Funciones toggle */}
        <SectionCard icon={Settings} title="Activar / desactivar funciones">
          <Toggle label="Consulta IA"           description="Habilita el módulo de consulta con Gemini"       defaultOn={true}  />
          <Toggle label="Comunidad / Foro"      description="Permite a usuarios publicar en el foro"          defaultOn={true}  />
          <Toggle label="Directorio de dermats" description="Muestra el directorio de dermatólogos"           defaultOn={true}  />
          <Toggle label="Modo mantenimiento"    description="Muestra pantalla de mantenimiento a los usuarios" defaultOn={false} />
          <Toggle label="Registro de nuevos"    description="Permite que nuevos usuarios se registren"        defaultOn={true}  />
        </SectionCard>

        {/* Contenido importante */}
        <SectionCard icon={Settings} title="Contenido editable de la PWA">
          <div className="adm-content-fields">
            <div className="adm-field">
              <label className="adm-label">Mensaje de bienvenida</label>
              <input className="adm-input" defaultValue="Tu rutina de cuidado consciente comienza aquí." />
            </div>
            <div className="adm-field">
              <label className="adm-label">Aviso legal / banner</label>
              <input className="adm-input" defaultValue="Skinova acompaña tu cuidado; no reemplaza una consulta dermatológica." />
            </div>
            <div className="adm-field">
              <label className="adm-label">URL de soporte</label>
              <input className="adm-input" defaultValue="https://skinova.app/soporte" />
            </div>
            <button className="adm-save-btn">
              <Save size={15} /> Guardar cambios
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

