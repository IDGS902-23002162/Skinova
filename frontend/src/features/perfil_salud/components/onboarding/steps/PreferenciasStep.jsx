import React, { useState } from 'react';
import '../../../../../shared/components/ToggleSwitch.css';

export default function PreferenciasStep({ formData, updateData, onNext, onBack }) {
  const [budget, setBudget] = useState(formData.budget || "");
  const [useLocation, setUseLocation] = useState(formData.use_location || false);
  const [city, setCity] = useState(formData.manual_city || "");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(formData.consents?.terms || false);
  const [notifications, setNotifications] = useState(formData.notification_preferences?.email || false);

  const budgetOptions = [
    { id: "low", label: "Económico" },
    { id: "medium", label: "Medio" },
    { id: "high", label: "Alto" },
    { id: "flexible", label: "Flexible" }
  ];

  const handleLocationToggle = (checked) => {
    setUseLocation(checked);
    if (checked) {
      setIsLoadingLocation(true);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            const cityName = data.address.city || data.address.town || data.address.village || "";
            if (cityName) setCity(cityName);
          } catch (err) {
            console.error(err);
          } finally {
            setIsLoadingLocation(false);
          }
        }, () => {
          setIsLoadingLocation(false);
          setUseLocation(false); // Revertir si niega permisos
        });
      } else {
        setIsLoadingLocation(false);
        setUseLocation(false);
      }
    } else {
      setCity("");
    }
  };

  const handleFinish = () => {
    updateData({
      budget,
      use_location: useLocation,
      manual_city: city,
      consents: { terms: acceptedTerms },
      notification_preferences: { email: notifications },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    onNext();
  };

  const handleSkip = () => {
    onNext();
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", maxWidth: "600px", margin: "0 auto", textAlign: "left" }}>
      <h2 style={{
        color: "var(--bosque-profundo, #163B35)",
        fontFamily: "DM Serif Display, serif",
        fontSize: "2rem",
        marginBottom: "2rem",
        textAlign: "center"
      }}>
        Una experiencia hecha para ti
      </h2>

      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--bosque-profundo, #163B35)" }}>
          Presupuesto mensual para productos
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {budgetOptions.map(opt => (
            <div
              key={opt.id}
              onClick={() => setBudget(opt.id)}
              style={{
                padding: "12px",
                border: `2px solid ${budget === opt.id ? "var(--bosque-medio, #2D6658)" : "var(--arena, #E7DFD2)"}`,
                borderRadius: "10px",
                textAlign: "center",
                cursor: "pointer",
                background: budget === opt.id ? "rgba(45, 102, 88, 0.05)" : "transparent",
                color: budget === opt.id ? "var(--bosque-profundo, #163B35)" : "var(--carbon, #1D2825)",
                fontWeight: budget === opt.id ? "bold" : "normal"
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "2rem", padding: "1.5rem", borderRadius: "12px", background: "var(--crema, #F6F3EC)" }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "var(--bosque-profundo, #163B35)" }}>
          Clima y entorno
        </h3>
        <p style={{ fontSize: "0.9rem", color: "var(--carbon, #1D2825)", opacity: 0.8, marginBottom: "1rem" }}>
          El clima afecta a tu piel. Podemos usar tu ubicación de forma segura o puedes indicarnos tu ciudad.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1rem" }}>
          <div className="checkbox-wrapper-5">
            <div className="check">
              <input
                type="checkbox"
                id="location-toggle"
                checked={useLocation}
                onChange={(e) => handleLocationToggle(e.target.checked)}
              />
              <label htmlFor="location-toggle"></label>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="location-toggle" style={{ fontSize: "1rem", color: "var(--carbon, #1D2825)", cursor: "pointer" }}>
              Compartir mi ubicación para adaptar las recomendaciones al clima local
            </label>
            {isLoadingLocation && <span style={{ fontSize: "0.85rem", color: "var(--bosque-medio, #2D6658)", marginTop: "4px" }}>Obteniendo ubicación...</span>}
            {city && <span style={{ fontSize: "0.85rem", color: "var(--salvia, #A9C4B5)", marginTop: "4px", fontWeight: "bold" }}>Ciudad detectada: {city}</span>}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "2rem", padding: "1.5rem", borderRadius: "12px", background: "var(--crema, #F6F3EC)" }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "var(--bosque-profundo, #163B35)" }}>
          Configuraciones finales
        </h3>
        <p style={{ fontSize: "0.9rem", color: "var(--carbon, #1D2825)", opacity: 0.8, marginBottom: "1rem" }}>
          Solo unos permisos para que Skinova funcione al máximo.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1rem" }}>
          <div className="checkbox-wrapper-5">
            <div className="check">
              <input
                type="checkbox"
                id="notifications-toggle"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
              <label htmlFor="notifications-toggle"></label>
            </div>
          </div>
          <label htmlFor="notifications-toggle" style={{ fontSize: "1rem", color: "var(--carbon, #1D2825)", cursor: "pointer" }}>
            Quiero recibir notificaciones de mi rutina y sugerencias
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="checkbox-wrapper-5">
            <div className="check">
              <input
                type="checkbox"
                id="terms-toggle"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label htmlFor="terms-toggle"></label>
            </div>
          </div>
          <label htmlFor="terms-toggle" style={{ fontSize: "1rem", color: "var(--carbon, #1D2825)", cursor: "pointer" }}>
            Acepto el uso de mis datos para personalizar mi experiencia
          </label>
        </div>
      </div>

      <div style={{ display: "flex", width: "100%", gap: "1rem", marginTop: "auto" }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            background: "transparent",
            color: "var(--bosque-profundo, #163B35)",
            border: "1px solid var(--bosque-profundo, #163B35)",
            padding: "14px 24px",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: "pointer"
          }}
        >
          Atrás
        </button>
        <button
          onClick={handleFinish}
          disabled={!acceptedTerms}
          style={{
            flex: 1,
            background: "var(--bosque-profundo, #163B35)",
            color: "var(--crema, #F6F3EC)",
            border: "none",
            padding: "14px 24px",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: acceptedTerms ? "pointer" : "not-allowed",
            opacity: acceptedTerms ? 1 : 0.5,
            transition: "all 0.2s ease"
          }}
        >
          Finalizar
        </button>
      </div>
    </div>
  );
}
