import React from "react";

export default function ProgressDots({ totalSteps = 6, currentStep = 1 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", marginBottom: "2rem" }}>
      {[...Array(totalSteps)].map((_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber <= currentStep;
        
        return (
          <div
            key={index}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: isActive ? "var(--bosque-medio, #2D6658)" : "var(--arena, #E7DFD2)",
              transition: "background-color 0.3s ease"
            }}
          />
        );
      })}
      <span style={{ marginLeft: "8px", fontSize: "14px", color: "var(--carbon, #1D2825)", opacity: 0.6 }}>
        {currentStep} de {totalSteps}
      </span>
    </div>
  );
}
