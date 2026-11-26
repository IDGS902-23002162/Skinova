import React from "react";
import { Wrench, ArrowLeft } from "lucide-react";

export default function MaintenanceModal({ moduleName, global = false, onBack }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        backgroundColor: "rgba(22, 59, 53, 0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          maxWidth: "420px",
          width: "100%",
          padding: "2rem",
          textAlign: "center",
          boxShadow: "0 16px 40px rgba(22, 59, 53, 0.18)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "rgba(201, 130, 104, 0.15)",
            color: "#C98268",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
          }}
        >
          <Wrench size={28} />
        </div>
        <h2 style={{ fontFamily: "DM Serif Display, serif", color: "#163B35", margin: "0 0 .5rem" }}>
          Bajo Mantenimiento
        </h2>
        <p style={{ color: "#5a7a71", fontSize: ".92rem", lineHeight: 1.5, margin: "0 0 1.5rem" }}>
          {global
            ? "Skinova se encuentra en mantenimiento programado. Volveremos en breve."
            : `El módulo "${moduleName}" se encuentra temporalmente en mantenimiento.`}
        </p>
        {!global && onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#163B35",
              color: "#F6F3EC",
              border: "none",
              padding: "11px 20px",
              borderRadius: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} /> Volver al inicio
          </button>
        )}
      </div>
    </div>
  );
}

