import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
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
  ArrowRight,
  Search
} from "lucide-react";
import MainLayout from "../../../shared/components/MainLayout";
import "./EnvironmentalMonitor.css";

const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8002/api").replace(/\/$/, "");

const FALLBACK_WEATHER = {
  city: "León, Guanajuato",
  lat: 21.1253,
  lon: -101.6713,
  temp: 24,
  feelsLike: 24,
  condition: "Despejado",
  humidity: 42,
  humidityStatus: "Óptima",
  uv: 5,
  uvLevel: "Moderado",
  aqi: 38,
  aqiStatus: "Buena",
  aiSummary:
    "Condiciones estables para tu piel. Mantén tu limpieza suave y protector solar diario.",
  aiTips: [
    "Aplica protector solar FPS 50+ como último paso de tu rutina matutina.",
    "Mantén la hidratación facial acorde al nivel de humedad actual.",
    "Realiza limpieza facial suave por la noche."
  ]
};

function EnvironmentalMonitorPage() {
  const navigate = useNavigate();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  // RF-AMB-01 y RF-AMB-02: Ubicación GPS y búsqueda predictiva
  const [locationConsent, setLocationConsent] = useState(false);
  const [selectedCity, setSelectedCity] = useState("León, Guanajuato");
  const [coords, setCoords] = useState({ lat: 21.1253, lon: -101.6713 });

  // Estado del buscador predictivo
  const [searchQuery, setSearchQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const searchBoxRef = useRef(null);

  // Datos ambientales actuales
  const [envData, setEnvData] = useState(FALLBACK_WEATHER);
  const [searchError, setSearchError] = useState("");

  // RF-AMB-10: Sincronización con Creador de Rutinas
  const [syncedWithRoutine, setSyncedWithRoutine] = useState(true);

  // RF-AMB-11 y RF-AMB-12: Actualización y resiliencia
  const [lastUpdated, setLastUpdated] = useState("Sincronizado");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiOffline, setApiOffline] = useState(false);

  const isHighUV = (envData.uv ?? 0) >= 6;

  // Cerrar lista predictiva al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Consultar condiciones ambientales desde el backend
  const fetchEnvironment = useCallback(
    async ({ city = null, lat = null, lon = null, isGps = false } = {}) => {
      if (apiOffline) return;
      setIsRefreshing(true);
      setSearchError("");

      try {
        const token = isSignedIn ? await getToken() : null;
        const params = new URLSearchParams();
        if (city && !isGps) params.append("city", city);
        if (lat != null) params.append("lat", lat);
        if (lon != null) params.append("lon", lon);

        const res = await fetch(`${API_BASE}/ambiente/current?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data = await res.json();
        if (!res.ok) {
          setSearchError(data.error || "No se pudo obtener el clima para esa ciudad.");
          setIsRefreshing(false);
          return;
        }

        setEnvData(data);
        if (data.city) setSelectedCity(data.city);
        if (data.lat != null && data.lon != null) {
          setCoords({ lat: data.lat, lon: data.lon });
        }
        if (typeof data.syncWithRoutine === "boolean") {
          setSyncedWithRoutine(data.syncWithRoutine);
        }
        if (isGps) {
          setLocationConsent(true);
        } else if (typeof data.useLocation === "boolean" && !city) {
          setLocationConsent(data.useLocation);
        }

        const now = new Date();
        setLastUpdated(
          `Actualizado ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        );
      } catch (err) {
        console.warn("Error conectando con /api/ambiente/current:", err);
        setSearchError("No se pudo conectar con el servidor ambiental.");
      } finally {
        setIsRefreshing(false);
      }
    },
    [apiOffline, getToken, isSignedIn]
  );

  // Carga inicial al entrar a la pestaña Ambiente
  useEffect(() => {
    if (!isLoaded) return;
    fetchEnvironment();
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Búsqueda predictiva con debounce de 280 ms mientras el usuario escribe
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setCitySuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCities(true);
      try {
        const res = await fetch(
          `${API_BASE}/ambiente/cities?q=${encodeURIComponent(trimmed)}`
        );
        if (res.ok) {
          const data = await res.json();
          setCitySuggestions(data.cities || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.warn("Error en búsqueda predictiva de ciudades:", err);
      } finally {
        setIsSearchingCities(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Seleccionar una ciudad de la lista predictiva
  const handleSelectSuggestedCity = async (cityObj) => {
    setShowSuggestions(false);
    setSearchQuery("");
    setLocationConsent(false);
    setSelectedCity(cityObj.name);
    setCoords({ lat: cityObj.lat, lon: cityObj.lon });

    await fetchEnvironment({
      city: cityObj.name,
      lat: cityObj.lat,
      lon: cityObj.lon,
      isGps: false,
    });
  };

  // Enviar búsqueda si presiona Enter sin hacer clic en la lista
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (citySuggestions.length > 0) {
      await handleSelectSuggestedCity(citySuggestions[0]);
      return;
    }
    if (!searchQuery.trim()) return;
    const typed = searchQuery.trim();
    setShowSuggestions(false);
    setSearchQuery("");
    setLocationConsent(false);
    await fetchEnvironment({ city: typed, isGps: false });
  };

  // RF-AMB-11: Actualización automática cada 5 minutos usando la ciudad/coordenadas activas
  useEffect(() => {
    const interval = setInterval(() => {
      if (!apiOffline) {
        fetchEnvironment({
          city: locationConsent ? null : selectedCity,
          lat: coords.lat,
          lon: coords.lon,
          isGps: locationConsent,
        });
      }
    }, 300000);

    return () => clearInterval(interval);
  }, [apiOffline, fetchEnvironment, locationConsent, selectedCity, coords]);

  // RF-AMB-01: Solicitar geolocalización real con consentimiento
  const handleRequestLocation = () => {
    setIsRefreshing(true);
    setSearchError("");

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setLocationConsent(true);
          setCoords({ lat, lon });
          await fetchEnvironment({ lat, lon, isGps: true });
        },
        () => {
          setLocationConsent(false);
          setIsRefreshing(false);
          setSearchError("No se otorgó permiso de ubicación en el navegador.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setIsRefreshing(false);
      setSearchError("Tu navegador no soporta geolocalización.");
    }
  };

  // RF-AMB-10: Guardar sincronización con rutina en backend
  const handleToggleRoutineSync = async () => {
    const nextValue = !syncedWithRoutine;
    setSyncedWithRoutine(nextValue);

    if (isSignedIn) {
      try {
        const token = await getToken();
        await fetch(`${API_BASE}/ambiente/preference`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sync_with_routine: nextValue }),
        });
      } catch (err) {
        console.warn("No se pudo actualizar la sincronización con rutina:", err);
      }
    }
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
              onClick={() =>
                fetchEnvironment({
                  city: locationConsent ? null : selectedCity,
                  lat: coords.lat,
                  lon: coords.lon,
                  isGps: locationConsent,
                })
              }
              disabled={apiOffline || isRefreshing}
              title="Actualizar condiciones ambientales"
            >
              <RefreshCw size={16} className={isRefreshing ? "spin-icon" : ""} />
              <span>{isRefreshing ? "Actualizando..." : lastUpdated}</span>
            </button>

            
          </div>
        </header>

        {/* RF-AMB-12: AVISO DE RESILIENCIA OFFLINE */}
        {apiOffline && (
          <div className="env-offline-banner" role="status">
            <WifiOff size={20} />
            <div>
              <strong>Servicio climático temporalmente no disponible</strong>
              <p>
                Mostrando las últimas condiciones guardadas para{" "}
                <b>{selectedCity}</b>. Tu creador de rutinas sigue funcionando con
                normalidad.
              </p>
            </div>
          </div>
        )}

        {/* RF-AMB-01 y RF-AMB-02: UBICACIÓN GPS + BUSCADOR PREDICTIVO DE CIUDAD */}
        <section className="location-bar-card">
          <div className="location-current">
            <div className="location-icon-box">
              <MapPin size={22} />
            </div>
            <div>
              <span className="location-label">
                {locationConsent
                  ? "Ubicación automática (GPS con consentimiento)"
                  : "Ubicación seleccionada"}
              </span>
              <h2>{selectedCity}</h2>
              <span className="condition-subtitle">
                Condición actual: <strong>{envData.condition}</strong>
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
              <span>{locationConsent ? "GPS Activo" : "Usar mi ubicación"}</span>
            </button>

            {/* Buscador predictivo de ciudades (sin lista desplegable fija) */}
            <div className="predictive-city-wrapper" ref={searchBoxRef}>
              <form onSubmit={handleSearchSubmit} className="custom-city-form">
                <div className="predictive-input-box">
                  <Search size={16} className="predictive-search-icon" />
                  <input
                    type="text"
                    placeholder="Buscar ciudad (ej. Guadalajara, Tampico)..."
                    value={searchQuery}
                    onFocus={() => {
                      if (citySuggestions.length > 0) setShowSuggestions(true);
                    }}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Buscar ciudad de forma predictiva"
                    autoComplete="off"
                  />
                </div>
                <button type="submit">Buscar</button>
              </form>

              {showSuggestions && (
                <ul className="city-suggestions-dropdown" role="listbox">
                  {isSearchingCities ? (
                    <li className="suggestion-status">Buscando ciudades...</li>
                  ) : citySuggestions.length === 0 ? (
                    <li className="suggestion-status">
                      Sin coincidencias para "{searchQuery}"
                    </li>
                  ) : (
                    citySuggestions.map((item, index) => (
                      <li key={`${item.label}-${index}`}>
                        <button
                          type="button"
                          className="suggestion-item-btn"
                          onClick={() => handleSelectSuggestedCity(item)}
                        >
                          <MapPin size={14} />
                          <span>{item.label}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
        </section>

        {searchError && (
          <div className="env-offline-banner" role="alert">
            <AlertTriangle size={18} />
            <span>{searchError}</span>
          </div>
        )}

        {/* RF-AMB-09: ALERTA POR ÍNDICE UV ELEVADO */}
        {isHighUV && (
          <section className="uv-alert-banner" role="alert">
            <div className="uv-alert-icon">
              <AlertTriangle size={22} />
            </div>
            <div className="uv-alert-content">
              <strong>
                Alerta de Radiación Solar: Índice UV {envData.uv} ({envData.uvLevel})
              </strong>
              <p>
                El nivel de radiación UV actual puede causar sensibilidad y
                manchas. Aplica protector solar FPS 50+ como último paso de tu
                rutina matutina y reaplica cada 2 a 3 horas.
              </p>
            </div>
          </section>
        )}

        {/* RF-AMB-03 al RF-AMB-07: MÉTRICAS AMBIENTALES ACTUALES */}
        <section
          className="metrics-grid"
          aria-label="Indicadores ambientales actuales"
        >
          <article className="metric-card">
            <div className="metric-top">
              <span className="metric-title">Temperatura</span>
              <div className="metric-icon">
                <Thermometer size={20} />
              </div>
            </div>
            <div className="metric-value">{envData.temp}°C</div>
            <p className="metric-detail">
              Sensación térmica de {envData.feelsLike}°C
            </p>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              <span className="metric-title">Humedad</span>
              <div className="metric-icon">
                <Droplets size={20} />
              </div>
            </div>
            <div className="metric-value">{envData.humidity}%</div>
            <p className="metric-detail">{envData.humidityStatus}</p>
          </article>

          <article className={`metric-card ${isHighUV ? "uv-highlight" : ""}`}>
            <div className="metric-top">
              <span className="metric-title">Índice UV</span>
              <div className="metric-icon">
                <Sun size={20} />
              </div>
            </div>
            <div className="metric-value">
              {envData.uv}{" "}
              <span className="metric-badge">{envData.uvLevel}</span>
            </div>
            <p className="metric-detail">
              {isHighUV
                ? "Requiere protección solar alta"
                : "Exposición moderada o baja"}
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
              {envData.aqi} <span className="metric-unit">ICA</span>
            </div>
            <p className="metric-detail">{envData.aqiStatus}</p>
          </article>
        </section>

        {/* RF-AMB-08 y RF-AMB-10: RECOMENDACIONES + INTEGRACIÓN CON CREADOR DE RUTINAS */}
        <section className="ai-env-panel">
          <div className="ai-recommendations-card">
            <div className="ai-card-header">
              <span className="ai-pill">
                <Sparkles size={14} />
                Recomendación Dermatológica Contextual
              </span>
              <h3>¿Qué significa este clima para tu piel?</h3>
            </div>

            <p className="ai-summary-text">{envData.aiSummary}</p>

            <ul className="ai-tips-list">
              {(envData.aiTips || []).map((tip, idx) => (
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
                onChange={handleToggleRoutineSync}
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