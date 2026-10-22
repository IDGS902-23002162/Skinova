import React, { useState, useMemo } from "react";
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
  Sparkles,
  CornerUpRight
} from "lucide-react";
import MainLayout from "../../../shared/components/MainLayout";
import "./DirectorioDerma.css";

// Datos simulados de especialistas cercanos con información pública (RF-DER-05)
const DERMATOLOGISTS_DATA = [
  {
    id: "der-1",
    name: "Dra. Valeria Montes de Oca",
    specialty: "Dermatología Clínica y Cosmética",
    license: "Céd. Prof. 8492014 · Certificada por el CMCD",
    clinic: "Centro Dermatológico del Bajío",
    address: "Av. Cerro Gordo 290, Cons. 402, Campestre, León, Gto.",
    distanceKm: 2.4,
    careType: "ambos", // Presencial y En línea
    careLabel: "Presencial y En línea",
    rating: 4.9,
    reviewsCount: 128,
    focusAreas: ["Acné severo", "Rosácea", "Dermatitis atópica", "Manchas"],
    schedule: "Lun a Vie · 09:00 - 19:00",
    contact: {
      phone: "+52 477 718 4520",
      email: "contacto@dravaleriamontes.mx",
      website: null
    },
    bookingPlatform: "Doctoralia",
    bookingUrl: "https://www.doctoralia.com.mx/",
    mapQuery: "Av.+Cerro+Gordo+290+Leon+Guanajuato",
    pinCoords: { top: "36%", left: "44%" }
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
    contact: {
      phone: "+52 477 788 5600",
      email: "citas@drsebastianherrera.com",
      website: null
    },
    bookingPlatform: "Doctoralia",
    bookingUrl: "https://www.doctoralia.com.mx/",
    mapQuery: "Hospital+Angeles+Leon+Guanajuato",
    pinCoords: { top: "28%", left: "62%" }
  },
  {
    id: "der-3",
    name: "Dra. Camila Solis ",
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
    contact: {
      phone: "+52 477 390 1122",
      email: "agenda@dermavita.mx",
      website: null
    },
    // Ejemplo cuando no hay plataforma externa (RF-DER-10: "cuando sea posible")
    bookingPlatform: null,
    bookingUrl: null,
    mapQuery: "Paseo+de+los+Insurgentes+1804+Leon+Guanajuato",
    pinCoords: { top: "58%", left: "32%" }
  },
  {
    id: "der-4",
    name: "Dr. Mateo Elizondo ",
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
    contact: {
      phone: "+52 477 601 9980",
      email: "consulta@drmateoelizondo.mx",
      website: null
    },
    bookingPlatform: null,
    bookingUrl: null,
    mapQuery: "Blvd+Aeropuerto+104+Leon+Guanajuato",
    pinCoords: { top: "74%", left: "72%" }
  }
];

function DirectorioDerma() {
  // RF-DER-01: Solicitar ubicación con consentimiento
  const [locationConsent, setLocationConsent] = useState(false);
  const [locationStatus, setLocationStatus] = useState("León, Gto. (Zona centro)");
  const [isLocating, setIsLocating] = useState(false);

  // RF-DER-02, RF-DER-06 y RF-DER-07: Búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [maxDistance, setMaxDistance] = useState(20); // en km
  const [selectedCareType, setSelectedCareType] = useState("todos");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // RF-DER-03 y RF-DER-04: Alternar vista en Lista o Mapa
  const [viewMode, setViewMode] = useState("list");
  const [selectedDoctorId, setSelectedDoctorId] = useState("der-1");

  // RF-DER-11: Guardar especialistas como favoritos
  const [favorites, setFavorites] = useState(["der-1"]);

  // RF-DER-12: Mostrar recomendación cuando IA detecta situación fuera del alcance cosmético
  const [showAiReferral, setShowAiReferral] = useState(true);

  // Solicitar geolocalización al usuario (RF-DER-01)
  const handleRequestLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationConsent(true);
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

  // Alternar favorito (RF-DER-11)
  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Abrir indicaciones en Google Maps (RF-DER-08)
  const handleOpenDirections = (doctor) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${doctor.mapQuery}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Redirigir a plataforma externa para agendar (RF-DER-10)
  const handleExternalBooking = (doctor) => {
    if (!doctor.bookingUrl) return;
    window.open(doctor.bookingUrl, "_blank", "noopener,noreferrer");
  };

  // Filtrado combinado de especialistas (RF-DER-02, 06, 07, 11)
  const filteredDoctors = useMemo(() => {
    return DERMATOLOGISTS_DATA.filter((doc) => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.clinic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.focusAreas.some((area) =>
          area.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesDistance = doc.distanceKm <= maxDistance;

      const matchesCareType =
        selectedCareType === "todos" ||
        doc.careType === selectedCareType ||
        doc.careType === "ambos";

      const matchesFavorite = !onlyFavorites || favorites.includes(doc.id);

      return (
        matchesSearch && matchesDistance && matchesCareType && matchesFavorite
      );
    });
  }, [searchQuery, maxDistance, selectedCareType, onlyFavorites, favorites]);

  const activeMapDoctor =
    filteredDoctors.find((d) => d.id === selectedDoctorId) ||
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

            {/* Botón para demostrar RF-DER-12 durante la presentación */}
            <button
              type="button"
              className={`btn-toggle-referral ${showAiReferral ? "active" : ""}`}
              onClick={() => setShowAiReferral(!showAiReferral)}
              title="Activar/ocultar aviso de derivación médica por IA (RF-DER-12)"
            >
              <Sparkles size={15} />
              <span>
                {showAiReferral
                  ? "Aviso IA Activo"
                  : "Simular Derivación IA"}
              </span>
            </button>
          </div>

          {/* RF-DER-12: RECOMENDACIÓN DE ATENCIÓN PROFESIONAL DESDE ANÁLISIS IA */}
          {showAiReferral && (
            <div className="ai-referral-banner" role="region" aria-label="Recomendación profesional">
              <div className="referral-icon">
                <AlertTriangle size={22} />
              </div>
              <div className="referral-copy">
                <strong>
                  Recomendación de valoración dermatológica profesional
                </strong>
                <p>
                  Tu último análisis en Skinova identificó señales de
                  sensibilidad persistente que requieren valoración médica y se
                  encuentran fuera del alcance cosmético. Te sugerimos consultar
                  a uno de los especialistas certificados del directorio.
                </p>
              </div>
            </div>
          )}
        </header>

        {/* RF-DER-01, 02, 06 y 07: BARRA DE UBICACIÓN, BÚSQUEDA Y FILTROS */}
        <section className="derm-controls-card" aria-label="Búsqueda y filtros">
          {/* Fila 1: Consentimiento de ubicación + Buscador */}
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

          {/* Fila 2: Filtros de Distancia (RF-DER-06), Tipo de Atención (RF-DER-07) y Favoritos (RF-DER-11) */}
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
                <Star
                  size={15}
                  fill={onlyFavorites ? "currentColor" : "none"}
                />
                <span>Favoritos ({favorites.length})</span>
              </button>
            </div>
          </div>
        </section>

        {/* SUBCABECERA: CONTADOR Y SELECTOR MINIMALISTA LISTA / MAPA (RF-DER-03 y RF-DER-04) */}
        <div className="derm-view-bar">
          <span className="results-counter">
            Mostrando <strong>{filteredDoctors.length}</strong> especialistas
            cercanos
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

        {/* RF-DER-03: MOSTRAR RESULTADOS EN LISTA */}
        {viewMode === "list" && filteredDoctors.length > 0 && (
          <section className="derm-list" aria-label="Lista de especialistas">
            {filteredDoctors.map((doc) => {
              const isFav = favorites.includes(doc.id);
              return (
                <article className="derm-card" key={doc.id}>
                  <div className="derm-card-main">
                    {/* Avatar / Iniciales */}
                    <div className="derm-avatar">
                      <Stethoscope size={24} />
                    </div>

                    {/* Información pública del especialista (RF-DER-05) */}
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
                        {/* RF-DER-11: Guardar como favorito */}
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
                          <Star
                            size={19}
                            fill={isFav ? "currentColor" : "none"}
                          />
                        </button>
                      </div>

                      <p className="derm-specialty">{doc.specialty}</p>
                      <p className="derm-license">{doc.license}</p>

                      <div className="derm-tags">
                        {doc.focusAreas.map((area) => (
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

                      {/* RF-DER-09: Medios de contacto disponibles */}
                      <div className="derm-contact-methods">
                        <a href={`tel:${doc.contact.phone}`} className="contact-chip">
                          <Phone size={14} />
                          <span>{doc.contact.phone}</span>
                        </a>
                        <a href={`mailto:${doc.contact.email}`} className="contact-chip">
                          <Mail size={14} />
                          <span>{doc.contact.email}</span>
                        </a>
                        {doc.contact.website && (
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

                  {/* Acciones: Cómo llegar (RF-DER-08) y Agendar externo (RF-DER-10) */}
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
                      <a
                        href={`tel:${doc.contact.phone}`}
                        className="btn-book-phone"
                      >
                        <Phone size={16} />
                        <span>Agendar por teléfono</span>
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* RF-DER-04: MOSTRAR RESULTADOS EN MAPA */}
        {viewMode === "map" && filteredDoctors.length > 0 && (
          <section className="derm-map-layout" aria-label="Mapa de especialistas">
            {/* Lienzo de mapa interactivo con pines */}
            <div className="map-canvas">
              <div className="map-grid-background" />
              <div className="map-user-marker" title="Tu ubicación actual">
                <span className="user-pulse" />
                <span className="user-dot" />
                <small>Tú estás aquí</small>
              </div>

              {filteredDoctors.map((doc) => {
                const isSelected = activeMapDoctor?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    style={{
                      top: doc.pinCoords.top,
                      left: doc.pinCoords.left
                    }}
                    className={`map-pin ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedDoctorId(doc.id)}
                  >
                    <MapPin size={18} />
                    <span>{doc.name.split(" ")[0]} {doc.name.split(" ")[1]}</span>
                  </button>
                );
              })}
            </div>

            {/* Tarjeta lateral del especialista seleccionado en el mapa */}
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
                        favorites.includes(activeMapDoctor.id)
                          ? "currentColor"
                          : "none"
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

                <div className="derm-contact-methods">
                  <a
                    href={`tel:${activeMapDoctor.contact.phone}`}
                    className="contact-chip"
                  >
                    <Phone size={14} />
                    <span>{activeMapDoctor.contact.phone}</span>
                  </a>
                </div>

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