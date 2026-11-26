import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/react";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  Search,
  List,
  Map as MapIcon,
  Star,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  AlertTriangle,
  Stethoscope,
  SlidersHorizontal,
  CornerUpRight
} from "lucide-react";
import MainLayout from "../../../shared/components/MainLayout";
import { directorioService } from "../services/directorioService";
import "leaflet/dist/leaflet.css";
import "./DirectorioDerma.css";

// Coordenadas reales de respaldo en León, Gto.
const DERMATOLOGISTS_DATA = [
  {
    id: "der-1",
    name: "Dra. Valeria Montes de Oca",
    specialty: "Dermatología Clínica y Cosmética",
    license: "Céd. Prof. 8492014 · Certificada por el CMCD",
    clinic: "Centro Dermatológico del Bajío",
    address: "Av. Cerro Gordo 290, Cons. 402, Campestre, León, Gto.",
    distanceKm: 2.4,
    careType: "ambos",
    careLabel: "Presencial y En línea",
    rating: 4.9,
    reviewsCount: 128,
    focusAreas: ["Acné severo", "Rosácea", "Dermatitis atópica", "Manchas"],
    schedule: "Lun a Vie · 09:00 - 19:00",
    contact: { phone: "+52 477 718 4520", email: "contacto@dravaleriamontes.mx", website: null },
    bookingPlatform: "Doctoralia",
    bookingUrl: "https://www.doctoralia.com.mx/",
    mapQuery: "Av.+Cerro+Gordo+290+Leon+Guanajuato",
    lat: 21.1253,
    lon: -101.6713
  },
  {
    id: "der-2",
    name: "Dr. Sebastian Herrera",
    specialty: "Dermato-Oncología y Cirugía Dermatológica",
    license: "Céd. Prof. 7310942 · Especialista en Lesiones Pigmentadas",
    clinic: "Hospital Ángeles León · Torre de Especialidades",
    address: "Av. Cerro Gordo 311, Cons. 615, Lomas del Campestre, León, Gto.",
    distanceKm: 3.8,
    careType: "presencial",
    careLabel: "Solo Presencial",
    rating: 5.0,
    reviewsCount: 94,
    focusAreas: ["Revisión de lunares", "Melasma", "Cicatrices", "Fotodaño"],
    schedule: "Lun a Sáb · 10:00 - 18:00",
    contact: { phone: "+52 477 788 5600", email: "citas@drsebastianherrera.com", website: null },
    bookingPlatform: "Doctoralia",
    bookingUrl: "https://www.doctoralia.com.mx/",
    mapQuery: "Hospital+Angeles+Leon+Guanajuato",
    lat: 21.1270,
    lon: -101.6680
  },
  {
    id: "der-3",
    name: "Dra. Camila Solis",
    specialty: "Tricología y Barrera Cutánea Sensible",
    license: "Céd. Prof. 9120455 · Miembro de la SMD",
    clinic: "Clínica DermaVita Jardines",
    address: "Blvd. Paseo de los Insurgentes 1804, Jardines del Moral, León, Gto.",
    distanceKm: 6.5,
    careType: "ambos",
    careLabel: "Presencial y En línea",
    rating: 4.8,
    reviewsCount: 76,
    focusAreas: ["Piel reactiva", "Alergias cutáneas", "Acné hormonal"],
    schedule: "Mar a Sáb · 09:30 - 17:30",
    contact: { phone: "+52 477 390 1122", email: "agenda@dermavita.mx", website: null },
    bookingPlatform: null,
    bookingUrl: null,
    mapQuery: "Paseo+de+los+Insurgentes+1804+Leon+Guanajuato",
    lat: 21.1178,
    lon: -101.6830
  },
  {
    id: "der-4",
    name: "Dr. Mateo Elizondo",
    specialty: "Teledermatología y Seguimiento Dermoestético",
    license: "Céd. Prof. 8834120 · Especialista Certificado",
    clinic: "Consultorio Médico Puerta Bajío",
    address: "Blvd. Aeropuerto 104, Torre Médica Sur, León, Gto.",
    distanceKm: 14.2,
    careType: "en_linea",
    careLabel: "Atención En Línea",
    rating: 4.7,
    reviewsCount: 61,
    focusAreas: ["Ajuste de retinoides", "Sensibilidad", "Control de sebo"],
    schedule: "Lun a Vie · 08:00 - 20:00",
    contact: { phone: "+52 477 601 9980", email: "consulta@drmateoelizondo.mx", website: null },
    bookingPlatform: null,
    bookingUrl: null,
    mapQuery: "Blvd+Aeropuerto+104+Leon+Guanajuato",
    lat: 21.0920,
    lon: -101.6520
  }
];

// Extrae coordenadas sin importar cómo las nombre el backend y usa respaldo local si vienen nulas
function getDoctorCoords(doc) {
  if (!doc) return null;

  const rawLat =
    doc.lat ??
    doc.latitude ??
    doc.coords?.lat ??
    doc.coords?.latitude ??
    doc.location?.lat;

  const rawLon =
    doc.lon ??
    doc.lng ??
    doc.longitude ??
    doc.coords?.lon ??
    doc.coords?.lng ??
    doc.coords?.longitude ??
    doc.location?.lng;

  const lat = rawLat !== null && rawLat !== undefined && rawLat !== "" ? Number(rawLat) : NaN;
  const lon = rawLon !== null && rawLon !== undefined && rawLon !== "" ? Number(rawLon) : NaN;

  if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
    return { lat, lon };
  }

  // Respaldo si el registro del backend aún no tiene coordenadas en BD
  const fallback = DERMATOLOGISTS_DATA.find(
    (item) =>
      String(item.id) === String(doc.id) ||
      item.name.toLowerCase().trim() === (doc.name || "").toLowerCase().trim()
  );

  return fallback ? { lat: fallback.lat, lon: fallback.lon } : null;
}

function LeafletMap({ doctors = [], selectedDoctor, onSelectDoctor, userCoords }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (container._leaflet_id) {
      container._leaflet_id = null;
    }

    const initialCoords = getDoctorCoords(selectedDoctor) || { lat: 21.1253, lon: -101.6713 };

    const map = L.map(container, {
      center: [initialCoords.lat, initialCoords.lon],
      zoom: 13,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    // Asegura que Leaflet conozca el ancho/alto real antes de posicionar pines
    map.invalidateSize();
    layer.clearLayers();
    const bounds = [];

    // Pin opcional de la ubicación del usuario si activó el GPS
    if (userCoords?.lat != null && userCoords?.lon != null) {
      const userIcon = L.divIcon({
        className: "skinova-user-pin",
        html: `<div style="
          width: 16px;
          height: 16px;
          background-color: #2563EB;
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.25);
          transform: translate(-50%, -50%);
        " title="Tu ubicación"></div>`,
        iconSize: null,
      });
      L.marker([userCoords.lat, userCoords.lon], { icon: userIcon }).addTo(layer);
      bounds.push([userCoords.lat, userCoords.lon]);
    }

    doctors.forEach((doc) => {
      const docCoords = getDoctorCoords(doc);
      if (!docCoords) return;

      bounds.push([docCoords.lat, docCoords.lon]);
      const isSelected = String(selectedDoctor?.id) === String(doc.id);

      const pinIcon = L.divIcon({
        className: "skinova-custom-pin",
        html: `<div style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background-color: ${isSelected ? "#C98268" : "#163B35"};
          color: #F6F3EC;
          padding: 6px 12px;
          border-radius: 20px;
          font-family: 'Manrope', sans-serif;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          border: 2px solid #FFFFFF;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
          transform: translate(-50%, -100%);
          cursor: pointer;
        ">📍 ${(doc.name || "Especialista").split(" ").slice(0, 2).join(" ")}</div>`,
        iconSize: null,
      });

      const marker = L.marker([docCoords.lat, docCoords.lon], {
        icon: pinIcon,
        zIndexOffset: isSelected ? 1000 : 100,
      }).addTo(layer);

      marker.on("click", () => {
        if (onSelectDoctor) onSelectDoctor(doc.id);
      });
    });

    const activeCoords = getDoctorCoords(selectedDoctor);

    if (activeCoords) {
      map.flyTo([activeCoords.lat, activeCoords.lon], 14, { duration: 0.6 });
    } else if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [45, 45] });
    }
  }, [doctors, selectedDoctor, onSelectDoctor, userCoords]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: "100%",
        height: "440px",
        minHeight: "440px",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid var(--arena, #E7DFD2)",
        position: "relative",
        zIndex: 1,
      }}
    />
  );
}

function DirectorioDerma() {
  const { getToken, isSignedIn } = useAuth();

  // RF-DER-01: Solicitar ubicación con consentimiento
  const [locationConsent, setLocationConsent] = useState(false);
  const [locationStatus, setLocationStatus] = useState("León, Gto. (Zona centro)");
  const [isLocating, setIsLocating] = useState(false);
  const [coords, setCoords] = useState({ lat: null, lon: null });

  // RF-DER-02, RF-DER-06 y RF-DER-07: Búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [maxDistance, setMaxDistance] = useState(20);
  const [selectedCareType, setSelectedCareType] = useState("todos");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Lista de dermatólogos obtenida del Backend o datos locales
  const [backendDoctors, setBackendDoctors] = useState(DERMATOLOGISTS_DATA);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);

  // RF-DER-03 y RF-DER-04: Alternar vista en Lista o Mapa
  const [viewMode, setViewMode] = useState("list");
  const [selectedDoctorId, setSelectedDoctorId] = useState("der-1");

  // RF-DER-11: Guardar especialistas como favoritos
  const [favorites, setFavorites] = useState(["der-1"]);

  // RF-DER-12: Recomendación de IA
  const [aiReferralData, setAiReferralData] = useState(null);

  const fetchDoctors = useCallback(async () => {
    setIsLoadingDoctors(true);
    try {
      const token = isSignedIn ? await getToken() : null;
      const res = await directorioService.getSpecialists(token, {
        lat: coords.lat,
        lon: coords.lon,
        q: searchQuery,
        maxDistance,
        careType: selectedCareType,
        onlyFavorites,
      });

      if (res && Array.isArray(res.specialists) && res.specialists.length > 0) {
        setBackendDoctors(res.specialists);
      }
    } catch (err) {
      console.warn("Error cargando dermatólogos desde el backend, usando catálogo local:", err);
    } finally {
      setIsLoadingDoctors(false);
    }
  }, [coords, searchQuery, maxDistance, selectedCareType, onlyFavorites, getToken, isSignedIn]);

  useEffect(() => {
    async function loadUserData() {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        const favsRes = await directorioService.getFavorites(token);
        if (favsRes && favsRes.favoriteIds) {
          setFavorites(favsRes.favoriteIds);
        }
        const refRes = await directorioService.getAiReferral(token);
        if (refRes && refRes.has_active_referral) {
          setAiReferralData(refRes);
        }
      } catch (err) {
        console.warn("No se pudieron cargar datos del usuario para el directorio:", err);
      }
    }
    loadUserData();
  }, [isSignedIn, getToken]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleRequestLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setLocationConsent(true);
          setCoords({ lat, lon });
          setLocationStatus("Ubicación actual sincronizada (GPS)");
          setIsLocating(false);
        },
        () => {
          setLocationConsent(false);
          setLocationStatus("Permiso denegado · Usando ciudad del perfil");
          setIsLocating(false);
        }
      );
    } else {
      setLocationConsent(true);
      setLocationStatus("Ubicación activa");
      setIsLocating(false);
    }
  };

  const toggleFavorite = async (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );

    if (isSignedIn) {
      try {
        const token = await getToken();
        await directorioService.toggleFavorite(token, id);
      } catch (err) {
        console.warn("Error al guardar favorito en backend:", err);
      }
    }
  };

  const handleOpenDirections = (doctor) => {
    const query = doctor.mapQuery || `${doctor.address} ${doctor.city || ""}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleExternalBooking = (doctor) => {
    if (!doctor.bookingUrl) return;
    window.open(doctor.bookingUrl, "_blank", "noopener,noreferrer");
  };

  const filteredDoctors = useMemo(() => {
    return backendDoctors.filter((doc) => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.clinic || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.focusAreas || []).some((area) =>
          area.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesDistance = (doc.distanceKm ?? 0) <= maxDistance;

      const matchesCareType =
        selectedCareType === "todos" ||
        doc.careType === selectedCareType ||
        doc.careType === "ambos";

      const matchesFavorite = !onlyFavorites || favorites.includes(doc.id);

      return matchesSearch && matchesDistance && matchesCareType && matchesFavorite;
    });
  }, [backendDoctors, searchQuery, maxDistance, selectedCareType, onlyFavorites, favorites]);

  const activeMapDoctor =
    filteredDoctors.find((d) => String(d.id) === String(selectedDoctorId)) ||
    filteredDoctors[0] ||
    null;

  return (
    <MainLayout>
      <div className="derm-directory-wrapper">
        {/* CABECERA */}
        <header className="derm-header">
          <div className="derm-header-top">
            <div>
              <h1>Directorio de Dermatólogos</h1>
              <p>
                Encuentra especialistas certificados cercanos para acompañar el
                cuidado clínico de tu piel.
              </p>
            </div>
          </div>

          {aiReferralData && (
            <div className="ai-referral-banner" role="region" aria-label="Recomendación profesional">
              <div className="referral-icon">
                <AlertTriangle size={22} />
              </div>
              <div className="referral-copy">
                <strong>
                  {aiReferralData.title || "Recomendación de valoración dermatológica profesional"}
                </strong>
                <p>{aiReferralData.message}</p>
                {aiReferralData.detected_concern && (
                  <span
                    className="referral-concern-badge"
                    style={{ fontSize: "12px", opacity: 0.9, marginTop: "4px", display: "inline-block" }}
                  >
                    Hallazgo identificado: <em>{aiReferralData.detected_concern}</em>
                  </span>
                )}
              </div>
            </div>
          )}
        </header>

        {/* BARRA DE UBICACIÓN, BÚSQUEDA Y FILTROS */}
        <section className="derm-controls-card" aria-label="Búsqueda y filtros">
          <div className="controls-top-row">
            <div className="search-input-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar por nombre, especialidad, síntoma o clínica..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar especialistas cercanos"
              />
            </div>

            <button
              type="button"
              className={`btn-location-consent ${locationConsent ? "active" : ""}`}
              onClick={handleRequestLocation}
            >
              <Navigation size={16} />
              <span>
                {isLocating
                  ? "Obteniendo ubicación..."
                  : locationConsent
                  ? "Ubicación GPS activa"
                  : "Permitir mi ubicación"}
              </span>
            </button>
          </div>

          <div className="controls-filters-row">
            <div className="location-status-chip">
              <MapPin size={15} />
              <span>{locationStatus}</span>
            </div>

            <div className="filters-group">
              <div className="filter-item">
                <SlidersHorizontal size={15} />
                <label htmlFor="distance-select">Distancia:</label>
                <select
                  id="distance-select"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                >
                  <option value={3}>Hasta 3 km</option>
                  <option value={5}>Hasta 5 km</option>
                  <option value={10}>Hasta 10 km</option>
                  <option value={20}>Hasta 20 km</option>
                </select>
              </div>

              <div className="filter-item">
                <Stethoscope size={15} />
                <label htmlFor="care-select">Atención:</label>
                <select
                  id="care-select"
                  value={selectedCareType}
                  onChange={(e) => setSelectedCareType(e.target.value)}
                >
                  <option value="todos">Todas las modalidades</option>
                  <option value="presencial">Presencial</option>
                  <option value="en_linea">En línea (Teleconsulta)</option>
                </select>
              </div>

              <button
                type="button"
                className={`btn-filter-favs ${onlyFavorites ? "active" : ""}`}
                onClick={() => setOnlyFavorites(!onlyFavorites)}
              >
                <Star size={15} fill={onlyFavorites ? "currentColor" : "none"} />
                <span>Favoritos ({favorites.length})</span>
              </button>
            </div>
          </div>
        </section>

        {/* SUBCABECERA */}
        <div className="derm-view-bar">
          <span className="results-counter">
            {isLoadingDoctors ? (
              "Buscando especialistas..."
            ) : (
              <>
                Mostrando <strong>{filteredDoctors.length}</strong> especialistas cercanos
              </>
            )}
          </span>

          <div className="view-toggle-pill" role="tablist">
            <button
              type="button"
              className={`pill-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <List size={17} />
              <span>Vista en Lista</span>
            </button>
            <button
              type="button"
              className={`pill-btn ${viewMode === "map" ? "active" : ""}`}
              onClick={() => setViewMode("map")}
            >
              <MapIcon size={17} />
              <span>Vista en Mapa</span>
            </button>
          </div>
        </div>

        {/* ESTADO SIN RESULTADOS */}
        {filteredDoctors.length === 0 && (
          <div className="empty-results-card">
            <p>
              No se encontraron especialistas con los filtros actuales. Intenta
              ampliar el rango de distancia o cambiar el tipo de atención.
            </p>
          </div>
        )}

        {/* VISTA EN LISTA */}
        {viewMode === "list" && filteredDoctors.length > 0 && (
          <section className="derm-list" aria-label="Lista de especialistas">
            {filteredDoctors.map((doc) => {
              const isFav = favorites.includes(doc.id);
              return (
                <article className="derm-card" key={doc.id}>
                  <div className="derm-card-main">
                    <div className="derm-avatar">
                      <Stethoscope size={24} />
                    </div>

                    <div className="derm-info">
                      <div className="derm-meta-row">
                        <span className="distance-badge">
                          <MapPin size={12} /> A {doc.distanceKm} km
                        </span>
                        <span className="care-type-badge">{doc.careLabel}</span>
                        <span className="rating-badge">
                          ★ {doc.rating} ({doc.reviewsCount})
                        </span>
                      </div>

                      <div className="derm-title-row">
                        <h2>{doc.name}</h2>
                        <button
                          type="button"
                          className={`btn-fav-star ${isFav ? "saved" : ""}`}
                          onClick={() => toggleFavorite(doc.id)}
                          aria-label={
                            isFav
                              ? "Quitar de especialistas favoritos"
                              : "Guardar especialista como favorito"
                          }
                        >
                          <Star size={19} fill={isFav ? "currentColor" : "none"} />
                        </button>
                      </div>

                      <p className="derm-specialty">{doc.specialty}</p>
                      <p className="derm-license">{doc.license}</p>

                      <div className="derm-tags">
                        {(doc.focusAreas || []).map((area) => (
                          <span key={area} className="focus-tag">
                            {area}
                          </span>
                        ))}
                      </div>

                      <div className="derm-clinic-box">
                        <strong>{doc.clinic}</strong>
                        <span>{doc.address}</span>
                        <small>Horario: {doc.schedule}</small>
                      </div>

                      <div className="derm-contact-methods">
                        {doc.contact?.phone && (
                          <a href={`tel:${doc.contact.phone}`} className="contact-chip">
                            <Phone size={14} />
                            <span>{doc.contact.phone}</span>
                          </a>
                        )}
                        {doc.contact?.email && (
                          <a href={`mailto:${doc.contact.email}`} className="contact-chip">
                            <Mail size={14} />
                            <span>{doc.contact.email}</span>
                          </a>
                        )}
                        {doc.contact?.website && (
                          <a
                            href={`https://${doc.contact.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-chip"
                          >
                            <Globe size={14} />
                            <span>{doc.contact.website}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="derm-card-actions">
                    <button
                      type="button"
                      className="btn-directions"
                      onClick={() => handleOpenDirections(doc)}
                    >
                      <CornerUpRight size={16} />
                      <span>Cómo llegar</span>
                    </button>

                    {doc.bookingUrl ? (
                      <button
                        type="button"
                        className="btn-book-external"
                        onClick={() => handleExternalBooking(doc)}
                      >
                        <span>Agendar en {doc.bookingPlatform}</span>
                        <ExternalLink size={16} />
                      </button>
                    ) : (
                      doc.contact?.phone && (
                        <a href={`tel:${doc.contact.phone}`} className="btn-book-phone">
                          <Phone size={16} />
                          <span>Agendar por teléfono</span>
                        </a>
                      )
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* VISTA EN MAPA */}
        {viewMode === "map" && filteredDoctors.length > 0 && (
          <section className="derm-map-layout" aria-label="Mapa de especialistas">
            <LeafletMap
              doctors={filteredDoctors}
              selectedDoctor={activeMapDoctor}
              onSelectDoctor={setSelectedDoctorId}
              userCoords={coords}
            />

            {activeMapDoctor && (
              <aside className="map-detail-card">
                <div className="map-detail-header">
                  <span className="distance-badge">
                    A {activeMapDoctor.distanceKm} km de ti
                  </span>
                  <button
                    type="button"
                    className={`btn-fav-star ${
                      favorites.includes(activeMapDoctor.id) ? "saved" : ""
                    }`}
                    onClick={() => toggleFavorite(activeMapDoctor.id)}
                    aria-label="Guardar especialista como favorito"
                  >
                    <Star
                      size={19}
                      fill={
                        favorites.includes(activeMapDoctor.id) ? "currentColor" : "none"
                      }
                    />
                  </button>
                </div>

                <h3>{activeMapDoctor.name}</h3>
                <p className="derm-specialty">{activeMapDoctor.specialty}</p>
                <p className="derm-license">{activeMapDoctor.license}</p>

                <div className="derm-clinic-box">
                  <strong>{activeMapDoctor.clinic}</strong>
                  <span>{activeMapDoctor.address}</span>
                  <small>{activeMapDoctor.careLabel}</small>
                </div>

                {activeMapDoctor.contact?.phone && (
                  <div className="derm-contact-methods">
                    <a
                      href={`tel:${activeMapDoctor.contact.phone}`}
                      className="contact-chip"
                    >
                      <Phone size={14} />
                      <span>{activeMapDoctor.contact.phone}</span>
                    </a>
                  </div>
                )}

                <div className="map-detail-actions">
                  <button
                    type="button"
                    className="btn-directions"
                    onClick={() => handleOpenDirections(activeMapDoctor)}
                  >
                    <CornerUpRight size={16} />
                    <span>Abrir en Mapas</span>
                  </button>

                  {activeMapDoctor.bookingUrl && (
                    <button
                      type="button"
                      className="btn-book-external"
                      onClick={() => handleExternalBooking(activeMapDoctor)}
                    >
                      <span>Agendar cita</span>
                      <ExternalLink size={16} />
                    </button>
                  )}
                </div>
              </aside>
            )}
          </section>
        )}
      </div>
    </MainLayout>
  );
}

export default DirectorioDerma;