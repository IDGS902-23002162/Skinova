import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Navigation,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  WifiOff,
  ArrowRight
} from "lucide-react";
import MainLayout from "../../../shared/components/MainLayout";
import "./EnvironmentalMonitor.css";

// Datos simulados por ciudad para probar cambios dinámicos (incluyendo UV alto y bajo)
const CITY_DATA = {
  "León, Gto": {
    temp: 28,
    feelsLike: 29,
    condition: "Soleado y seco",
    humidity: 26,
    humidityStatus: "Baja (Ambiente seco)",
    uv: 9,
    uvLevel: "Muy Alto",
    aqi: 42,
    aqiStatus: "Buena",
    aiSummary:
      "La combinación de radiación UV muy alta y baja humedad favorece la deshidratación transepidérmica y el estrés oxidativo.",
    aiTips: [
      "Prioriza un sérum con Ácido Hialurónico sobre la piel húmeda hoy.",
      "Reaplica tu Protector Solar FPS 50+ cada 2 horas si estás al exterior.",
      "Sella tu hidratación con una crema reparadora de barrera."
    ]
  },
  "Ciudad de México": {
    temp: 23,
    feelsLike: 24,
    condition: "Parcialmente nublado",
    humidity: 48,
    humidityStatus: "Óptima",
    uv: 7,
    uvLevel: "Alto",
    aqi: 85,
    aqiStatus: "Moderada (Partículas PM2.5)",
    aiSummary:
      "La presencia moderada de contaminación urbana y radiación UV alta requiere reforzar los antioxidantes por la mañana y la limpieza nocturna.",
    aiTips: [
      "Utiliza tu Sérum de Vitamina C por la mañana para neutralizar radicales libres.",
      "Realiza doble limpieza esta noche para retirar micropartículas contaminantes.",
      "No omitas el protector solar aunque observes nubes."
    ]
  },
  "Monterrey, N.L.": {
    temp: 33,
    feelsLike: 35,
    condition: "Caluroso y despejado",
    humidity: 35,
    humidityStatus: "Moderada-Baja",
    uv: 10,
    uvLevel: "Extremo",
    aqi: 60,
    aqiStatus: "Aceptable",
    aiSummary:
      "Las altas temperaturas aumentan la producción de sebo mientras que el índice UV extremo exige máxima fotoprotección con texturas ligeras.",
    aiTips: [
      "Opta por hidratantes en gel o emulsiones ligeras para no saturar los poros.",
      "Usa protector solar de toque seco y busca sombra entre las 11:00 y 16:00 hrs.",
      "Evita exfoliantes fuertes si hoy tuviste exposición solar directa."
    ]
  },
  "Bogotá, Col": {
    temp: 15,
    feelsLike: 14,
    condition: "Fresco y nublado",
    humidity: 72,
    humidityStatus: "Alta",
    uv: 4,
    uvLevel: "Moderado",
    aqi: 32,
    aqiStatus: "Buena",
    aiSummary:
      "El clima frío y húmedo mantiene la hidratación superficial, pero el viento frío puede sensibilizar la piel reactiva.",
    aiTips: [
      "Usa un limpiador gentil que calme posibles rojeces por el frío.",
      "Aplica protector solar de forma habitual; la altitud mantiene la radiación activa.",
      "Ideal para incorporar activos renovadores suaves en tu rutina nocturna."
    ]
  }
};

function EnvironmentalMonitorPage() {
  const navigate = useNavigate();

  // RF-AMB-01 y RF-AMB-02: Consentimiento de ubicación y selección manual
  const [locationConsent, setLocationConsent] = useState(false);
  const [selectedCity, setSelectedCity] = useState("León, Gto");
  const [customCityInput, setCustomCityInput] = useState("");

  // RF-AMB-10: Incorporar condiciones al creador de rutinas
  const [syncedWithRoutine, setSyncedWithRoutine] = useState(true);

  // RF-AMB-11 y RF-AMB-12: Auto-actualización y resiliencia ante caída de API
  const [lastUpdated, setLastUpdated] = useState("Hace unos segundos");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiOffline, setApiOffline] = useState(false);

  const currentData = CITY_DATA[selectedCity] || CITY_DATA["León, Gto"];
  const isHighUV = currentData.uv >= 6; // RF-AMB-09: Alerta por índice UV elevado

  // RF-AMB-11: Simulación de actualización automática periódica (cada 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!apiOffline) {
        const now = new Date();
        setLastUpdated(
          `Actualizado a las ${now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}`
        );
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [apiOffline]);

  // Solicitar geolocalización con consentimiento (RF-AMB-01)
  const handleRequestLocation = () => {
    setIsRefreshing(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationConsent(true);
          setSelectedCity("León, Gto");
          setLastUpdated("Ubicación GPS sincronizada");
          setIsRefreshing(false);
        },
        () => {
          // Si el usuario rechaza en el navegador, mantenemos selección manual
          setLocationConsent(false);
          setIsRefreshing(false);
        }
      );
    } else {
      setLocationConsent(true);
      setIsRefreshing(false);
    }
  };

  // Refrescar datos manualmente
  const handleManualRefresh = () => {
    if (apiOffline) return;
    setIsRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      setLastUpdated(
        `Actualizado a las ${now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })}`
      );
      setIsRefreshing(false);
    }, 600);
  };

  // Agregar ciudad personalizada (RF-AMB-02)
  const handleCustomCitySubmit = (e) => {
    e.preventDefault();
    if (!customCityInput.trim()) return;
    const cityName = customCityInput.trim();
    if (!CITY_DATA[cityName]) {
      CITY_DATA[cityName] = {
        temp: 25,
        feelsLike: 26,
        condition: "Parcialmente despejado",
        humidity: 45,
        humidityStatus: "Óptima",
        uv: 6,
        uvLevel: "Alto",
        aqi: 38,
        aqiStatus: "Buena",
        aiSummary: `Condiciones equilibradas en ${cityName}, pero con radiación solar suficiente para requerir protección antioxidante y solar.`,
        aiTips: [
          "Mantén tu limpieza facial suave mañana y noche.",
          "Aplica protector solar FPS 50+ antes de salir.",
          "Ajusta tu crema hidratante según sientas la piel al final del día."
        ]
      };
    }
    setSelectedCity(cityName);
    setLocationConsent(false);
    setCustomCityInput("");
  };

  return (
    <MainLayout>
      <div className="env-monitor-wrapper">
        {/* CABECERA */}
        <header className="env-header">
          <div>
            <h1>Monitoreo Ambiental</h1>
            <p>
              Observa cómo el clima y la calidad del aire de tu entorno influyen
              en las necesidades de tu piel hoy.
            </p>
          </div>

          <div className="env-header-actions">
            <button
              className="btn-refresh"
              onClick={handleManualRefresh}
              disabled={apiOffline || isRefreshing}
              title="Actualizar condiciones ambientales"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "spin-icon" : ""}
              />
              <span>{lastUpdated}</span>
            </button>

            {/* Botón para probar RF-AMB-12 (Resiliencia cuando falla la API) */}
            <button
              className={`btn-simulate-offline ${apiOffline ? "active" : ""}`}
              onClick={() => setApiOffline(!apiOffline)}
              title="Probar estado sin conexión con proveedor externo (RF-AMB-12)"
            >
              <WifiOff size={15} />
              <span>{apiOffline ? "Proveedor Offline" : "Simular fallo API"}</span>
            </button>
          </div>
        </header>

        {/* RF-AMB-12: AVISO DE RESILIENCIA SI EL PROVEEDOR NO ESTÁ DISPONIBLE */}
        {apiOffline && (
          <div className="env-offline-banner" role="status">
            <WifiOff size={20} />
            <div>
              <strong>Servicio climático temporalmente no disponible</strong>
              <p>
                Mostrando las últimas condiciones guardadas para{" "}
                <b>{selectedCity}</b>. Tu creador de rutinas y recomendaciones
                siguen funcionando con normalidad.
              </p>
            </div>
          </div>
        )}

        {/* RF-AMB-01 y RF-AMB-02: PANEL DE UBICACIÓN Y SELECCIÓN MANUAL */}
        <section className="location-bar-card">
          <div className="location-current">
            <div className="location-icon-box">
              <MapPin size={22} />
            </div>
            <div>
              <span className="location-label">
                {locationConsent
                  ? "Ubicación automática (GPS con consentimiento)"
                  : "Selección manual de ciudad"}
              </span>
              <h2>{selectedCity}</h2>
              <span className="condition-subtitle">
                Condición actual: <strong>{currentData.condition}</strong>
              </span>
            </div>
          </div>

          <div className="location-controls">
            <button
              type="button"
              className={`btn-gps ${locationConsent ? "active" : ""}`}
              onClick={handleRequestLocation}
            >
              <Navigation size={16} />
              <span>
                {locationConsent ? "GPS Activo" : "Usar mi ubicación"}
              </span>
            </button>

            <select
              className="city-select"
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setLocationConsent(false);
              }}
              aria-label="Seleccionar ciudad manualmente"
            >
              {Object.keys(CITY_DATA).map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <form onSubmit={handleCustomCitySubmit} className="custom-city-form">
              <input
                type="text"
                placeholder="Otra ciudad..."
                value={customCityInput}
                onChange={(e) => setCustomCityInput(e.target.value)}
                aria-label="Escribir nombre de ciudad manualmente"
              />
              <button type="submit">Cambiar</button>
            </form>
          </div>
        </section>

        {/* RF-AMB-09: ALERTA POR ÍNDICE UV ELEVADO */}
        {isHighUV && (
          <section className="uv-alert-banner" role="alert">
            <div className="uv-alert-icon">
              <AlertTriangle size={22} />
            </div>
            <div className="uv-alert-content">
              <strong>
                Alerta de Radiación Solar: Índice UV {currentData.uv} (
                {currentData.uvLevel})
              </strong>
              <p>
                El nivel de radiación UV actual puede causar sensibilidad y
                manchas. Te recomendamos aplicar protector solar FPS 50+ como
                último paso de tu rutina matutina y reaplicar cada 2 a 3 horas.
              </p>
            </div>
          </section>
        )}

        {/* RF-AMB-03 al RF-AMB-07: MÉTRICAS AMBIENTALES ACTUALES */}
        <section
          className="metrics-grid"
          aria-label="Indicadores ambientales actuales"
        >
          {/* Temperatura (RF-AMB-03) */}
          <article className="metric-card">
            <div className="metric-top">
              <span className="metric-title">Temperatura</span>
              <div className="metric-icon">
                <Thermometer size={20} />
              </div>
            </div>
            <div className="metric-value">{currentData.temp}°C</div>
            <p className="metric-detail">
              Sensación térmica de {currentData.feelsLike}°C
            </p>
          </article>

          {/* Humedad (RF-AMB-04) */}
          <article className="metric-card">
            <div className="metric-top">
              <span className="metric-title">Humedad</span>
              <div className="metric-icon">
                <Droplets size={20} />
              </div>
            </div>
            <div className="metric-value">{currentData.humidity}%</div>
            <p className="metric-detail">{currentData.humidityStatus}</p>
          </article>

          {/* Índice UV (RF-AMB-05) */}
          <article className={`metric-card ${isHighUV ? "uv-highlight" : ""}`}>
            <div className="metric-top">
              <span className="metric-title">Índice UV</span>
              <div className="metric-icon">
                <Sun size={20} />
              </div>
            </div>
            <div className="metric-value">
              {currentData.uv}{" "}
              <span className="metric-badge">{currentData.uvLevel}</span>
            </div>
            <p className="metric-detail">
              {isHighUV
                ? "Requiere protección solar alta"
                : "Exposición moderada"}
            </p>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              <span className="metric-title">Calidad del Aire</span>
              <div className="metric-icon">
                <Wind size={20} />
              </div>
            </div>
            <div className="metric-value">
              {currentData.aqi} <span className="metric-unit">ICA</span>
            </div>
            <p className="metric-detail">{currentData.aqiStatus}</p>
          </article>
        </section>

        <section className="ai-env-panel">
          <div className="ai-recommendations-card">
            <div className="ai-card-header">
              <span className="ai-pill">
                <Sparkles size={14} />
                Recomendación Contextual IA
              </span>
              <h3>¿Qué significa este clima para tu piel?</h3>
            </div>

            <p className="ai-summary-text">{currentData.aiSummary}</p>

            <ul className="ai-tips-list">
              {currentData.aiTips.map((tip, idx) => (
                <li key={idx}>
                  <CheckCircle2 size={18} className="tip-check-icon" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="routine-context-card">
            <h3>Conexión con tu Rutina</h3>
            <p>
              Permite que el Creador de Rutinas ajuste automáticamente las
              texturas y pasos sugeridos según el clima actual de{" "}
              <strong>{selectedCity}</strong>.
            </p>

            <label className="context-toggle">
              <input
                type="checkbox"
                checked={syncedWithRoutine}
                onChange={() => setSyncedWithRoutine(!syncedWithRoutine)}
              />
              <span className="context-check">
                {syncedWithRoutine && <CheckCircle2 size={16} />}
              </span>
              <span>
                {syncedWithRoutine
                  ? "Clima vinculado a mi rutina"
                  : "Vincular clima a mi rutina"}
              </span>
            </label>

            <button
              type="button"
              className="btn-go-routine"
              onClick={() => navigate("/rutinas")}
            >
              <span>Ver mi rutina ajustada</span>
              <ArrowRight size={18} />
            </button>
          </aside>
        </section>
      </div>
    </MainLayout>
  );
}

export default EnvironmentalMonitorPage;