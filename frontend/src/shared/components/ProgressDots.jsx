import React from "react";

export default function ProgressDots({
  totalSteps = 6,
  currentStep = 1,
  mode = "steps", // "steps" (por defecto para onboarding) | "carousel" (para carrusel)
  onDotClick,
  className = "",
  style = {},
  showText = true
}) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        justifyContent: "center",
        marginBottom: mode === "carousel" ? "12px" : "2rem",
        ...style
      }}
    >
      {[...Array(totalSteps)].map((_, index) => {
        const stepNumber = index + 1;
        const isActive = mode === "carousel" ? stepNumber === currentStep : stepNumber <= currentStep;
        
        return (
          <button
            key={index}
            type="button"
            onClick={onDotClick ? () => onDotClick(index) : undefined}
            disabled={!onDotClick}
            aria-label={`Ir al paso ${stepNumber}`}
            style={{
              padding: 0,
              border: "none",
              cursor: onDotClick ? "pointer" : "default",
              width: mode === "carousel" && isActive ? "20px" : "8px",
              height: "8px",
              borderRadius: "4px",
              backgroundColor: isActive ? "var(--bosque-medio, #2D6658)" : "var(--arena, #E7DFD2)",
              transition: "all 0.3s ease",
              outline: "none"
            }}
          />
        );
      })}
      {showText && (
        <span style={{ marginLeft: "8px", fontSize: "13px", color: "var(--carbon, #1D2825)", opacity: 0.6, fontWeight: 500 }}>
          {currentStep} de {totalSteps}
        </span>
      )}
    </div>
  );
}
