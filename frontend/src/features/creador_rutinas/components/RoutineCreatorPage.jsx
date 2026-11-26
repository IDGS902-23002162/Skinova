import React, { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  Plus,
  Sun,
  Moon,
  ShieldCheck,
  BookmarkCheck,
  History,
  DollarSign,
  Sliders,
  RefreshCw,
} from "lucide-react";
import MainLayout from "../../../shared/components/MainLayout";
import { useRoutines } from "../hooks/useRoutines";
import RoutineCard from "../components/RoutineCard";
import "./RoutineCreator.css";

function RoutineCreatorPage() {
  const [rutinaActiva, setRutinaActiva] = useState("matutina");
  const [openTip, setOpenTip] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  const {
    versions,
    currentVersion,
    selectedVersionId,
    setSelectedVersionId,
    activeVersionId,
    profileContext,
    done,
    budget,
    setBudget,
    loading,
    regeneratingStepId,
    statusBanner,
    setStatusBanner,
    toggleDone,
    handleTogglePauseProduct,
    handleReplaceStepProduct,
    handleAddStep,
    handleSaveActiveRoutine,
    handleGenerateNewVersion,
    handleApplySmartAdjustment,
  } = useRoutines();

  const productosActuales = currentVersion?.[rutinaActiva] || [];
  const isCurrentActive = currentVersion?.id === activeVersionId;

  return (
    <MainLayout>
      <div className="routine-creator-wrapper">
        {/* CABECERA PRINCIPAL */}
        <header className="page-header">
          <div className="header-top">
            <div>
              <h1>Creador de Rutinas</h1>
              <p>
                Tu secuencia {rutinaActiva === "matutina" ? "matutina" : "nocturna"}{" "}
                personalizada con base en tu perfil y neceser.
              </p>
            </div>

            <div className="header-buttons">
              <button
                type="button"
                className={`btn-save-routine ${isCurrentActive ? "saved" : ""}`}
                onClick={handleSaveActiveRoutine}
              >
                <BookmarkCheck size={18} />
                <span>
                  {isCurrentActive ? "Rutina Activa" : "Establecer como Activa"}
                </span>
              </button>

              <button
                type="button"
                className="btn-save-routine"
                onClick={handleGenerateNewVersion}
                title="Generar una nueva versión conservando el historial"
              >
                <RefreshCw size={17} />
                <span>Nueva Versión IA</span>
              </button>

              <button
                type="button"
                className="btn-add-step"
                onClick={() => handleAddStep(rutinaActiva)}
              >
                <Plus size={18} />
                <span>Añadir paso</span>
              </button>
            </div>
          </div>

          {/* BARRA DE CONTEXTO DEL PERFIL, ALERGIAS, PRESUPUESTO Y VERSIONES */}
          <div className="routine-context-bar">
            <div className="profile-constraints">
              <span className="constraint-chip">
                <strong>Perfil:</strong> {profileContext.skinType} · {profileContext.sensitivity}
              </span>
              <span className="constraint-chip">
                <strong>Objetivos:</strong>{" "}
                {Array.isArray(profileContext.goals)
                  ? profileContext.goals.join(", ")
                  : profileContext.goals}
              </span>
              <span className="constraint-chip allergy-chip">
                <AlertTriangle size={13} />
                <strong>Restricciones:</strong>{" "}
                {profileContext.allergies?.length > 0
                  ? profileContext.allergies.join(", ")
                  : "Ninguna"}
              </span>
              <span className="constraint-chip safe-chip">
                <ShieldCheck size={14} />
                Ingredientes compatibles
              </span>
            </div>

            <div className="routine-preferences-controls">
              <div className="pref-select-box">
                <DollarSign size={14} />
                <label htmlFor="budget-select">Presupuesto:</label>
                <select
                  id="budget-select"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                >
                  <option value="economico">Accesible ($)</option>
                  <option value="medio">Medio ($$)</option>
                  <option value="premium">Dermo-Clínico ($$$)</option>
                </select>
              </div>

              <div className="pref-select-box">
                <History size={14} />
                <label htmlFor="version-select">Versión:</label>
                <select
                  id="version-select"
                  value={selectedVersionId || ""}
                  onChange={(e) => setSelectedVersionId(Number(e.target.value))}
                >
                  {versions.map((ver) => (
                    <option key={ver.id} value={ver.id}>
                      {ver.version_label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* BANNER DE AJUSTE INTELIGENTE (RF-RUT-18) */}
          {currentVersion && !currentVersion.smart_adjusted && (
            <div className="smart-adjustment-card">
              <div className="smart-adjustment-info">
                <span className="smart-badge">
                  <Sparkles size={13} /> Ajuste Inteligente Disponible
                </span>
                <strong>
                  Sugerencia basada en tu Clima, Hábitos y Bitácora de Progreso
                </strong>
                <p>
                  Detectamos ambiente seco y radiación solar elevada. La IA sugiere
                  incorporar un refuerzo de Ácido Hialurónico en tu rutina matutina.
                </p>
              </div>
              <button
                type="button"
                className="btn-apply-smart"
                onClick={handleApplySmartAdjustment}
              >
                <Sliders size={16} />
                <span>Aplicar ajuste IA</span>
              </button>
            </div>
          )}

          {statusBanner && (
            <div className="routine-status-toast" role="status">
              <span>{statusBanner}</span>
              <button type="button" onClick={() => setStatusBanner("")}>
                Entendido
              </button>
            </div>
          )}

          {/* SELECTOR MINIMALISTA TIPO PÍLDORA */}
          <div className="routine-toggle">
            <button
              type="button"
              className={`toggle-btn ${rutinaActiva === "matutina" ? "active" : ""}`}
              onClick={() => setRutinaActiva("matutina")}
            >
              <Sun size={18} />
              Morning Routine
            </button>
            <button
              type="button"
              className={`toggle-btn ${rutinaActiva === "nocturna" ? "active" : ""}`}
              onClick={() => setRutinaActiva("nocturna")}
            >
              <Moon size={18} />
              Night Routine
            </button>
          </div>
        </header>

        {/* LISTA DE PASOS DE LA RUTINA */}
        {loading ? (
          <p>Sincronizando tu rutina personalizada...</p>
        ) : (
          <section className="routine-list" aria-label="Routine steps">
            {productosActuales.map((product, index) => (
              <RoutineCard
                key={product.id}
                product={product}
                isLast={index === productosActuales.length - 1}
                isDone={done.includes(product.id)}
                isRegenerating={regeneratingStepId === product.id}
                isTipOpen={openTip === product.id}
                isMenuOpen={openMenu === product.id}
                onToggleDone={toggleDone}
                onToggleTip={() =>
                  setOpenTip(openTip === product.id ? null : product.id)
                }
                onToggleMenu={() =>
                  setOpenMenu(openMenu === product.id ? null : product.id)
                }
                onReplaceStep={() => {
                  setOpenMenu(null);
                  handleReplaceStepProduct(product.id);
                }}
                onTogglePause={() => {
                  setOpenMenu(null);
                  handleTogglePauseProduct(product.id);
                }}
              />
            ))}
          </section>
        )}
      </div>
    </MainLayout>
  );
}

export default RoutineCreatorPage;